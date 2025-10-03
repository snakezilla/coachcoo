import {
  Routine,
  Step,
  StepEvent,
  InterpreterSnapshot,
  InterpreterEventResult,
  Branch,
  BranchResolution,
  StepEventType,
} from "./types";

export function createInterpreter(routine: Routine): InterpreterSnapshot {
  if (!routine.steps?.length) {
    return {
      routine,
      status: "completed",
      currentStepId: undefined,
      attemptCounts: {},
      successCounts: {},
      completedStepIds: [],
    };
  }

  const firstStepId = routine.steps[0].id;
  return {
    routine,
    status: "running",
    currentStepId: firstStepId,
    attemptCounts: { [firstStepId]: 1 },
    successCounts: {},
    completedStepIds: [],
  };
}

export function getCurrentStep(snapshot: InterpreterSnapshot): Step | undefined {
  if (!snapshot.currentStepId) return undefined;
  return findStep(snapshot.routine, snapshot.currentStepId);
}

export function isFinished(snapshot: InterpreterSnapshot): boolean {
  return snapshot.status === "completed" || snapshot.status === "aborted";
}

export function applyEvent(
  snapshot: InterpreterSnapshot,
  event: StepEvent
): InterpreterEventResult {
  if (snapshot.status === "completed" || snapshot.status === "aborted") {
    return {
      snapshot,
      transition: {
        done: true,
        repeat: false,
        reason: event.type,
      },
    };
  }

  const step = getCurrentStep(snapshot);
  if (!step || step.id !== event.stepId) {
    return {
      snapshot,
      transition: {
        done: !step,
        repeat: false,
        reason: event.type,
      },
    };
  }

  switch (event.type) {
    case "abort": {
      const aborted: InterpreterSnapshot = {
        ...snapshot,
        status: "aborted",
        currentStepId: undefined,
      };
      return {
        snapshot: aborted,
        transition: {
          done: true,
          repeat: false,
          reason: "abort",
        },
      };
    }
    case "heard":
    case "confirm": {
      const requiredSuccesses = step.shaping?.requiredSuccesses ?? 1;
      const currentSuccesses = snapshot.successCounts[step.id] ?? 0;
      const nextSuccessCount = currentSuccesses + 1;

      const updatedSnapshot: InterpreterSnapshot = {
        ...snapshot,
        successCounts: {
          ...snapshot.successCounts,
          [step.id]: nextSuccessCount,
        },
      };

      if (nextSuccessCount < requiredSuccesses) {
        return {
          snapshot: updatedSnapshot,
          transition: {
            done: false,
            repeat: true,
            reason: event.type,
            step,
          },
        };
      }

      const resolution = resolveBranch(
        updatedSnapshot,
        step,
        step.onHeard,
        event.type
      );

      const progressed = progressToNextStep(updatedSnapshot, step, resolution);
      return {
        snapshot: progressed.snapshot,
        transition: {
          ...resolution,
          done: progressed.done,
          step: progressed.nextStep,
        },
      };
    }
    case "timeout": {
      const resolution = resolveBranch(snapshot, step, step.onTimeout, "timeout");
      const progressed = progressToNextStep(snapshot, step, resolution);
      return {
        snapshot: progressed.snapshot,
        transition: {
          ...resolution,
          done: progressed.done,
          step: progressed.nextStep,
        },
      };
    }
    default:
      return assertNever(event);
  }
}

function resolveBranch(
  snapshot: InterpreterSnapshot,
  step: Step,
  branch: Branch | undefined,
  reason: StepEventType
): BranchResolution {
  const sequentialNext = getSequentialNextStepId(snapshot.routine, step.id);
  const currentAttempts = snapshot.attemptCounts[step.id] ?? 1;
  const shapingMaxAttempts = step.shaping?.maxAttempts;

  if (!branch) {
    return {
      reason,
      repeat: false,
      nextStepId: sequentialNext,
    };
  }

  const retryMax = branch.retry?.max ?? shapingMaxAttempts ?? Infinity;
  const canRetry = branch.retry && currentAttempts < retryMax;

  if (canRetry) {
    return {
      branch,
      reason,
      repeat: true,
      nextStepId: step.id,
      promptOverride: branch.retry?.promptOverride,
      celebrate: branch.celebrate,
      reward: branch.reward,
    };
  }

  const nextStepId = branch.next ?? sequentialNext;

  return {
    branch,
    reason,
    repeat: false,
    nextStepId,
    celebrate: branch.celebrate,
    reward: branch.reward,
  };
}

function progressToNextStep(
  snapshot: InterpreterSnapshot,
  currentStep: Step,
  resolution: BranchResolution
): { snapshot: InterpreterSnapshot; done: boolean; nextStep?: Step } {
  const completedStepIds = snapshot.completedStepIds.includes(currentStep.id)
    ? snapshot.completedStepIds
    : [...snapshot.completedStepIds, currentStep.id];

  if (!resolution.nextStepId) {
    const doneSnapshot: InterpreterSnapshot = {
      ...snapshot,
      currentStepId: undefined,
      status: "completed",
      completedStepIds,
    };
    return { snapshot: doneSnapshot, done: true };
  }

  const nextStep = findStep(snapshot.routine, resolution.nextStepId);
  if (!nextStep) {
    const doneSnapshot: InterpreterSnapshot = {
      ...snapshot,
      currentStepId: undefined,
      status: "completed",
      completedStepIds,
    };
    return { snapshot: doneSnapshot, done: true };
  }

  const nextAttemptCounts = { ...snapshot.attemptCounts };
  const currentCount = nextAttemptCounts[nextStep.id] ?? 0;
  nextAttemptCounts[nextStep.id] = currentCount + 1;

  const stayOnSameStep = nextStep.id === currentStep.id && resolution.repeat;

  const nextSnapshot: InterpreterSnapshot = {
    ...snapshot,
    currentStepId: nextStep.id,
    status: "running",
    attemptCounts: nextAttemptCounts,
    completedStepIds: stayOnSameStep ? snapshot.completedStepIds : completedStepIds,
  };

  return { snapshot: nextSnapshot, done: false, nextStep };
}

function findStep(routine: Routine, stepId: string): Step | undefined {
  return routine.steps.find((s) => s.id === stepId);
}

function getSequentialNextStepId(routine: Routine, currentStepId: string): string | undefined {
  const index = routine.steps.findIndex((s) => s.id === currentStepId);
  if (index === -1) return undefined;
  const next = routine.steps[index + 1];
  return next?.id;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled event type: ${JSON.stringify(value)}`);
}
