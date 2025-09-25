export type State = "IDLE" | "PROMPT" | "LISTEN" | "EVAL" | "REINFORCE" | "END";

export type Step = {
  id: string;
  prompt: { tts: string; anim?: string };
  listen?: { mode: "confirm"; timeout_seconds: number };
  success?: { tts?: string; anim?: string };
  fallback?: { tts?: string; anim?: string };
};

export type Routine = { id: string; title: string; steps: Step[] };

export type Ctx = {
  routine: Routine;
  stepIdx: number;
  heard: boolean;
  startedAt: number;
  sessionId: string;
};

export function next(state: State, ctx: Ctx, evt: { type: string; payload?: any }): [State, Ctx] {
  switch (state) {
    case "IDLE":
      return ["PROMPT", ctx];
    case "PROMPT":
      return ["LISTEN", ctx];
    case "LISTEN":
      if (evt.type === "CONFIRM_HEARD") return ["EVAL", { ...ctx, heard: true }];
      if (evt.type === "TIMEOUT") return ["EVAL", ctx];
      return ["LISTEN", ctx];
    case "EVAL":
      return ["REINFORCE", ctx];
    case "REINFORCE": {
      const last = ctx.stepIdx >= ctx.routine.steps.length - 1;
      if (last) return ["END", ctx];
      return ["PROMPT", { ...ctx, stepIdx: ctx.stepIdx + 1, heard: false }];
    }
    default:
      return ["END", ctx];
  }
}