type ListenOptions = {
  timeoutMs: number;
  onHeard: () => void;
  onTimeout: () => void;
};

// Minimal stub that simulates a VAD callback and timeout handling.
export function listenForConfirmation({ timeoutMs, onHeard, onTimeout }: ListenOptions) {
  if (timeoutMs <= 0) {
    onTimeout();
    return () => {};
  }

  const autoConfirmMs = Math.min(2000, Math.max(0, timeoutMs - 500));
  const confirmTimer = autoConfirmMs > 0
    ? setTimeout(() => {
        clearTimers();
        onHeard();
      }, autoConfirmMs)
    : null;
  const timeoutTimer = setTimeout(() => {
    clearTimers();
    onTimeout();
  }, timeoutMs);

  function clearTimers() {
    if (confirmTimer) clearTimeout(confirmTimer);
    clearTimeout(timeoutTimer);
  }

  return () => {
    clearTimers();
  };
}
