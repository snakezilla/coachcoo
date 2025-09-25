import { State, Ctx, Routine, next } from "../stateMachine";
import { speak, stopSpeak } from "../../services/tts";
import { logEvent } from "../../services/db";

export class Runner {
  private state: State = "IDLE";
  private ctx: Ctx;

  constructor(private routine: Routine, sessionId: string) {
    this.ctx = { routine, stepIdx: 0, heard: false, startedAt: Date.now(), sessionId };
  }

  get currentStep() { return this.ctx.routine.steps[this.ctx.stepIdx]; }
  get currentState() { return this.state; }

  async start() {
    [this.state, this.ctx] = next(this.state, this.ctx, { type: "START" });
    await this.doPrompt();
  }

  async confirmHeard() {
    [this.state, this.ctx] = next(this.state, this.ctx, { type: "CONFIRM_HEARD" });
    await this.doReinforce();
  }

  async timeout() {
    [this.state, this.ctx] = next(this.state, this.ctx, { type: "TIMEOUT" });
    await this.doReinforce();
  }

  private async doPrompt() {
    const step = this.currentStep;
    await logEvent({
      id: cryptoRandom(), session_id: this.ctx.sessionId, ts: Date.now(),
      step_id: step.id, type: "prompt", value: { tts: step.prompt.tts }
    });
    await speak(step.prompt.tts);
    [this.state, this.ctx] = next("PROMPT", this.ctx, { type: "PROMPT_DONE" });
  }

  private async doReinforce() {
    const step = this.currentStep;
    const ok = this.ctx.heard;
    const line = ok ? step.success?.tts ?? "Great job!" : step.fallback?.tts ?? "We’ll try again later.";
    await logEvent({
      id: cryptoRandom(), session_id: this.ctx.sessionId, ts: Date.now(),
      step_id: step.id, type: "eval", value: { heard: ok }
    });
    await speak(line);
    [this.state, this.ctx] = next("REINFORCE", this.ctx, { type: "REINFORCE_DONE" });
    if (this.state === "PROMPT") await this.doPrompt();
    if (this.state === "END") stopSpeak();
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function computeEngagement(totalSteps: number, heardCount: number) {
  if (totalSteps === 0) return 0;
  return heardCount / totalSteps;
}
