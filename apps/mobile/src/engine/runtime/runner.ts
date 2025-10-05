import { AUTO_CONFIRM_AFTER_MS, LISTEN_TIMEOUT_MS, USE_STUB_LISTENER } from "../../config";
import { nanoId } from "../../lib/id";
import { PersonalizationContext, pickPromptText, personalizeText } from "./personalization";
import { applyEvent, createInterpreter, getCurrentStep, isFinished } from "../stateMachine/interpreter";
import {
  InterpreterSnapshot,
  Prompt,
  Routine,
  Step,
  StepEvent,
  StepEventType,
} from "../stateMachine/types";
import { IStt } from "../../services/stt";
import { IVad } from "../../services/vad";
import { RunnerLogger } from "../../services/db/models";

export type RunnerStatus =
  | "idle"
  | "prompting"
  | "listening"
  | "waiting-confirm"
  | "completed"
  | "aborted"
  | "error";

export interface RunnerSnapshot {
  status: RunnerStatus;
  sessionId: string;
  routineId: string;
  stepIndex: number;
  totalSteps: number;
  currentStepId?: string;
  promptText?: string;
  promptAnim?: string;
  lastTranscript?: string;
  lastKeyword?: string;
  lastEventType?: StepEventType;
  engagement: number;
  celebrateAnim?: string;
  celebrateTts?: string;
  rewardPoints?: number;
  rewardSticker?: string;
  errorMessage?: string;
}

export interface RunnerOptions {
  sessionId: string;
  routine: Routine;
  childProfile: {
    id: string;
    displayName: string;
    name?: string;
    nickname?: string;
  };
  personalization?: PersonalizationContext;
  listenTimeoutMs?: number;
  autoConfirmMs?: number;
  useStubListener?: boolean;
}

export interface RunnerTtsAdapter {
  speak(text: string): Promise<void>;
  stop?(): Promise<void>;
}

export interface RunnerDependencies {
  tts: RunnerTtsAdapter;
  stt?: IStt | null;
  vad?: IVad | null;
  logger: RunnerLogger;
  now?: () => number;
}

const noop = () => undefined;

export class RoutineRunner {
  private readonly deps: RunnerDependencies;
  private readonly options: RunnerOptions;
  private readonly routine: Routine;
  private readonly listeners = new Set<(snapshot: RunnerSnapshot) => void>();
  private interpreter: InterpreterSnapshot;
  private snapshot: RunnerSnapshot;
  private processing: Promise<void> = Promise.resolve();
  private disposed = false;
  private listening = false;
  private listenAbort?: AbortController;
  private listenTimer?: ReturnType<typeof setTimeout>;
  private autoConfirmTimer?: ReturnType<typeof setTimeout>;
  private successes = new Set<string>();
  private started = false;

  constructor(options: RunnerOptions, dependencies: RunnerDependencies) {
    this.options = options;
    this.deps = { ...dependencies };
    this.routine = options.routine;
    this.interpreter = createInterpreter(this.routine);
    this.snapshot = {
      status: isFinished(this.interpreter) ? "completed" : "idle",
      sessionId: options.sessionId,
      routineId: this.routine.id,
      stepIndex: -1,
      totalSteps: this.routine.steps.length,
      engagement: 0,
    };
  }

  public subscribe(listener: (snapshot: RunnerSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): RunnerSnapshot {
    return this.snapshot;
  }

  public async start(): Promise<void> {
    if (this.started) {
      return this.processing;
    }
    this.started = true;
    await this.queue(async () => {
      if (isFinished(this.interpreter)) {
        this.updateSnapshot({ status: "completed", stepIndex: this.routine.steps.length });
        return;
      }
      await this.runCurrentStep();
    });
  }

  public async confirmCurrentStep(method: "manual" | "auto" = "manual"): Promise<void> {
    await this.queue(async () => {
      if (this.snapshot.status === "completed" || this.snapshot.status === "aborted") return;
      const step = this.requireCurrentStep();
      this.stopListening();
      this.cancelAutoConfirm();
      await this.logEvent(method === "auto" ? "auto_confirm" : "manual_confirm", {
        method,
      });
      await this.advanceWithEvent({
        type: "confirm",
        stepId: step.id,
        at: this.now(),
      });
    });
  }

  public async timeoutCurrentStep(source: "manual" | "auto" = "auto"): Promise<void> {
    await this.queue(async () => {
      if (this.snapshot.status === "completed" || this.snapshot.status === "aborted") return;
      const step = this.requireCurrentStep();
      this.stopListening();
      this.cancelAutoConfirm();
      await this.logEvent(source === "manual" ? "manual_timeout" : "timeout", {
        source,
      });
      const timeoutMs = step.listen?.timeoutMs ?? this.options.listenTimeoutMs ?? LISTEN_TIMEOUT_MS;
      await this.advanceWithEvent({
        type: "timeout",
        stepId: step.id,
        at: this.now(),
        timeoutMs,
      });
    });
  }

  public async abort(reason: string): Promise<void> {
    await this.queue(async () => {
      if (this.snapshot.status === "completed" || this.snapshot.status === "aborted") return;
      this.stopListening();
      this.cancelAutoConfirm();
      await this.logEvent("abort", { reason });
      await this.advanceWithEvent({
        type: "abort",
        stepId: this.requireCurrentStep().id,
        at: this.now(),
        reason,
      });
      this.updateSnapshot({ status: "aborted", currentStepId: undefined, stepIndex: this.routine.steps.length });
      if (this.deps.tts.stop) {
        await this.deps.tts.stop();
      }
    });
  }

  public async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.stopListening();
    this.cancelAutoConfirm();
    if (this.deps.tts.stop) {
      await this.deps.tts.stop();
    }
    await this.processing.catch(noop);
  }

  private async runCurrentStep(promptOverride?: Prompt): Promise<void> {
    const step = this.requireCurrentStep();
    const prompt = promptOverride ?? step.prompt;
    const context: PersonalizationContext = {
      child: this.options.childProfile,
      routineId: this.routine.id,
      sessionId: this.options.sessionId,
      ...this.options.personalization,
    };

    const promptText = pickPromptText(prompt, context) || personalizeText(step.prompt.tts, context);
    this.updateSnapshot({
      status: "prompting",
      currentStepId: step.id,
      stepIndex: this.indexForStep(step.id),
      promptText,
      promptAnim: prompt.anim,
      lastEventType: undefined,
      celebrateAnim: undefined,
      celebrateTts: undefined,
      rewardPoints: undefined,
      rewardSticker: undefined,
    });

    await this.logEvent("prompt", {
      stepId: step.id,
      promptText,
      anim: prompt.anim,
    });

    await this.deps.tts.speak(promptText);

    if (!this.shouldListen(step)) {
      this.enterManualConfirm("listener_disabled");
      return;
    }

    await this.beginListening(step);
  }

  private shouldListen(step: Step): boolean {
    if (!step.listen) return false;
    if (this.options.useStubListener ?? USE_STUB_LISTENER) return false;
    if (!this.deps.stt) return false;
    return true;
  }

  private async beginListening(step: Step): Promise<void> {
    const timeoutMs = step.listen?.timeoutMs ?? this.options.listenTimeoutMs ?? LISTEN_TIMEOUT_MS;
    this.updateSnapshot({ status: "listening" });

    this.listening = true;
    this.listenAbort = new AbortController();

    const keywords = step.listen?.keywords ?? [];

    const recordPromise = this.deps.stt?.recordUntil({
      timeoutMs,
      keywords,
      signal: this.listenAbort.signal,
    });

    if (recordPromise) {
      recordPromise
        .then(async (result) => {
          if (!this.listening) return;
          if (!result) {
            await this.timeoutCurrentStep("auto");
            return;
          }
          const matchedKeyword = matchKeyword(keywords, result.text);
          if (keywords.length && !matchedKeyword) {
            await this.logEvent("stt_no_match", {
              transcript: result.text,
              keywords,
            });
            this.enterManualConfirm("stt_no_match", result.text);
            return;
          }
          await this.logEvent("heard", {
            transcript: result.text,
            confidence: result.confidence,
            keyword: matchedKeyword,
          });
          await this.advanceWithEvent({
            type: "heard",
            stepId: step.id,
            at: this.now(),
            transcript: result.text,
            keywordMatched: matchedKeyword ?? undefined,
          });
        })
        .catch(async (error) => {
          if (!this.listening) return;
          if (error?.name === "AbortError") return;
          await this.logEvent("stt_error", {
            message: error?.message ?? String(error),
          });
          this.enterManualConfirm("stt_error");
        });
    } else {
      this.enterManualConfirm("no_stt");
    }

    this.listenTimer = setTimeout(() => {
      if (!this.listening) return;
      void this.timeoutCurrentStep("auto");
    }, timeoutMs + 250);
  }

  private enterManualConfirm(reason: string, transcript?: string) {
    this.stopListening();
    this.updateSnapshot({ status: "waiting-confirm", lastTranscript: transcript ?? this.snapshot.lastTranscript });
    this.scheduleAutoConfirm();
    void this.logEvent("awaiting_confirm", { reason });
  }

  private async advanceWithEvent(event: StepEvent): Promise<void> {
    this.stopListening();
    const result = applyEvent(this.interpreter, event);
    this.interpreter = result.snapshot;

    const isSuccessEvent = (event.type === "heard" || event.type === "confirm") && !result.transition.repeat;
    if (isSuccessEvent) {
      this.successes.add(event.stepId);
    }

    const engagement = calcEngagement(this.successes.size, this.routine.steps.length);

    this.updateSnapshot({
      lastEventType: event.type,
      engagement,
      celebrateAnim: result.transition.celebrate?.anim,
      celebrateTts: result.transition.celebrate?.tts,
      rewardPoints: result.transition.reward?.points,
      rewardSticker: result.transition.reward?.sticker,
      lastTranscript: "transcript" in event ? event.transcript ?? this.snapshot.lastTranscript : this.snapshot.lastTranscript,
      lastKeyword: "keywordMatched" in event ? event.keywordMatched ?? this.snapshot.lastKeyword : this.snapshot.lastKeyword,
    });

    if (result.transition.done || isFinished(this.interpreter)) {
      this.updateSnapshot({
        status: this.snapshot.status === "aborted" ? "aborted" : "completed",
        currentStepId: undefined,
        stepIndex: this.routine.steps.length,
      });
      await this.logEvent("routine_completed", {
        engagement,
      });
      if (this.deps.tts.stop) {
        await this.deps.tts.stop();
      }
      this.cancelAutoConfirm();
      return;
    }

    const nextStep = result.transition.step ?? getCurrentStep(this.interpreter);
    if (!nextStep) {
      this.updateSnapshot({ status: "completed", currentStepId: undefined, stepIndex: this.routine.steps.length });
      await this.logEvent("routine_completed", {
        engagement,
      });
      return;
    }

    const promptOverride = result.transition.promptOverride;
    await this.runCurrentStep(promptOverride);
  }

  private stopListening() {
    if (!this.listening) return;
    this.listening = false;
    this.listenAbort?.abort();
    this.listenAbort = undefined;
    if (this.listenTimer) {
      clearTimeout(this.listenTimer);
      this.listenTimer = undefined;
    }
  }

  private scheduleAutoConfirm() {
    if (this.autoConfirmTimer) return;
    const autoConfirmMs = this.options.autoConfirmMs ?? AUTO_CONFIRM_AFTER_MS;
    if (!autoConfirmMs || autoConfirmMs <= 0) return;
    this.autoConfirmTimer = setTimeout(() => {
      void this.confirmCurrentStep("auto");
    }, autoConfirmMs);
  }

  private cancelAutoConfirm() {
    if (!this.autoConfirmTimer) return;
    clearTimeout(this.autoConfirmTimer);
    this.autoConfirmTimer = undefined;
  }

  private async logEvent(type: string, value: Record<string, unknown>): Promise<void> {
    await this.deps.logger.logEvent({
      id: nanoId(),
      sessionId: this.options.sessionId,
      routineId: this.routine.id,
      stepId: this.snapshot.currentStepId ?? "(none)",
      ts: this.now(),
      value,
      type,
    });
  }

  private indexForStep(stepId: string): number {
    return this.routine.steps.findIndex((s) => s.id === stepId);
  }

  private requireCurrentStep(): Step {
    const step = getCurrentStep(this.interpreter);
    if (!step) {
      throw new Error("RoutineRunner: no current step available");
    }
    return step;
  }

  private updateSnapshot(patch: Partial<RunnerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private queue(task: () => Promise<void>): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.processing = this.processing.then(task).catch((error) => {
      this.handleError(error);
    });
    return this.processing;
  }

  private handleError(error: unknown) {
    console.error("RoutineRunner error", error);
    this.updateSnapshot({ status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
  }

  private now(): number {
    return this.deps.now ? this.deps.now() : Date.now();
  }
}

function matchKeyword(keywords: string[], text: string): string | null {
  if (!keywords.length) return null;
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) return keyword;
  }
  return null;
}

function calcEngagement(successes: number, total: number): number {
  if (!total) return 0;
  const value = successes / total;
  return Number(value.toFixed(2));
}
