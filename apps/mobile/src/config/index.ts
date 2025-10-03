import { runtimeSecrets } from "./secrets";

export const LISTEN_TIMEOUT_MS = 15000;
export const AUTO_CONFIRM_AFTER_MS = 8000;

const DEFAULT_ADAPTERS = {
  tts: "expo",
  stt: "whisper",
  vad: "rms",
  brain: "openai",
} as const;

export type AdapterRegistry = {
  tts: typeof DEFAULT_ADAPTERS.tts;
  stt: typeof DEFAULT_ADAPTERS.stt | "stub";
  vad: typeof DEFAULT_ADAPTERS.vad;
  brain: typeof DEFAULT_ADAPTERS.brain | "none";
};

const shouldUseStubListener = runtimeSecrets.forceStubListener || !runtimeSecrets.sttEnabled;

export const USE_STUB_LISTENER = shouldUseStubListener;

export const ADAPTERS: AdapterRegistry = {
  tts: DEFAULT_ADAPTERS.tts,
  stt: shouldUseStubListener ? "stub" : DEFAULT_ADAPTERS.stt,
  vad: DEFAULT_ADAPTERS.vad,
  brain: runtimeSecrets.llmEnabled ? DEFAULT_ADAPTERS.brain : "none",
};

export const FEATURE_FLAGS = {
  enableBrainFallbackCopy: true,
  enableManualConfirmAlways: true,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;

export default {
  LISTEN_TIMEOUT_MS,
  AUTO_CONFIRM_AFTER_MS,
  USE_STUB_LISTENER,
  ADAPTERS,
  FEATURE_FLAGS,
};
