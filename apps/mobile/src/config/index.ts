import { runtimeSecrets, SECRETS } from "./secrets";

export const LISTEN_TIMEOUT_MS = 15000;
export const AUTO_CONFIRM_AFTER_MS = 8000;

// Default adapter choices for each subsystem
const DEFAULT_ADAPTERS = {
  tts: "expo", // ✅ switched to Expo speech instead of ElevenLabs
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

// STT listener logic (stub if no STT available)
const shouldUseStubListener = runtimeSecrets.forceStubListener || !runtimeSecrets.sttEnabled;

export const USE_STUB_LISTENER = shouldUseStubListener;

// Adapter resolution
export const ADAPTERS: AdapterRegistry = {
  tts: DEFAULT_ADAPTERS.tts,
  stt: shouldUseStubListener ? "stub" : DEFAULT_ADAPTERS.stt,
  vad: DEFAULT_ADAPTERS.vad,
  brain: runtimeSecrets.llmEnabled ? DEFAULT_ADAPTERS.brain : "none",
};

// Feature flags
export const FEATURE_FLAGS = {
  enableBrainFallbackCopy: true,
  enableManualConfirmAlways: true,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;

// Global runtime config
export const CONFIG = {
  AVATAR_DRIVER: "rive" as const,
  TTS_PROVIDER: (SECRETS.ELEVENLABS_API_KEY ? "elevenlabs" : "stub") as "elevenlabs" | "stub",
  TTS_SAMPLE_RATE: 22050,
  VISEME_FRAME_MS: 40,
};

export default {
  LISTEN_TIMEOUT_MS,
  AUTO_CONFIRM_AFTER_MS,
  USE_STUB_LISTENER,
  ADAPTERS,
  FEATURE_FLAGS,
  CONFIG,
};
