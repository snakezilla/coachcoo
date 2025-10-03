export interface RoutineGlobals {
  listen?: {
    timeoutMs?: number;
  };
  reinforcement?: Record<string, unknown>;
}

export interface Routine {
  id: string;
  title: string;
  globals?: RoutineGlobals;
  steps: Step[];
}

export interface StepShaping {
  requiredSuccesses?: number;
  maxAttempts?: number;
}

export interface Step {
  id: string;
  prompt: Prompt;
  listen?: Listen;
  onHeard?: Branch;
  onTimeout?: Branch;
  shaping?: StepShaping;
}

export interface PromptVariant {
  text: string;
  weight?: number;
}

export interface Prompt {
  anim?: string;
  tts?: string;
  ttsVariants?: PromptVariant[];
  ssml?: boolean;
}

export interface Listen {
  timeoutMs?: number;
  keywords?: string[];
}

export interface BranchRetry {
  max?: number;
  promptOverride?: Prompt;
}

export interface BranchReward {
  points?: number;
  sticker?: string;
}

export interface BranchCelebrate {
  anim?: string;
  tts?: string;
}

export interface Branch {
  next?: string;
  retry?: BranchRetry;
  celebrate?: BranchCelebrate;
  reward?: BranchReward;
}

export type StepEventType = "heard" | "confirm" | "timeout" | "abort";

export interface StepEventBase {
  stepId: string;
  at: number;
}

export interface HeardEvent extends StepEventBase {
  type: "heard" | "confirm";
  transcript?: string;
  keywordMatched?: string;
}

export interface TimeoutEvent extends StepEventBase {
  type: "timeout";
  timeoutMs: number;
}

export interface AbortEvent extends StepEventBase {
  type: "abort";
  reason: string;
}

export type StepEvent = HeardEvent | TimeoutEvent | AbortEvent;

export interface InterpreterSnapshot {
  routine: Routine;
  currentStepId?: string;
  status: "idle" | "running" | "completed" | "aborted";
  attemptCounts: Record<string, number>;
  successCounts: Record<string, number>;
  completedStepIds: string[];
}

export interface BranchResolution {
  nextStepId?: string;
  repeat: boolean;
  branch?: Branch;
  celebrate?: BranchCelebrate;
  reward?: BranchReward;
  promptOverride?: Prompt;
  reason: StepEventType;
}

export interface InterpreterEventResult {
  snapshot: InterpreterSnapshot;
  transition: BranchResolution & {
    done: boolean;
    step?: Step;
  };
}
