import Constants from "expo-constants";

export interface RuntimeSecrets {
  OPENAI_API_KEY?: string;
  sttEnabled: boolean;
  llmEnabled: boolean;
  forceStubListener: boolean;
}

function readSecret(key: string): string {
  const envVar = typeof process.env[key] === "string" ? (process.env[key] as string) : undefined;
  const expoPublic = typeof process.env[`EXPO_PUBLIC_${key}`] === "string" ? (process.env[`EXPO_PUBLIC_${key}`] as string) : undefined;
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const configKey = typeof extra?.[key] === "string" ? (extra[key] as string) : undefined;
  return (expoPublic ?? envVar ?? configKey ?? "").trim();
}

export const OPENAI_API_KEY = readSecret("OPENAI_API_KEY");
const ELEVENLABS_API_KEY = readSecret("ELEVENLABS_API_KEY");
const ELEVENLABS_VOICE_ID = readSecret("ELEVENLABS_VOICE_ID");

export const SECRETS = {
  OPENAI_API_KEY,
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID,
};

if (!OPENAI_API_KEY) {
  console.warn(
    "[coach-coo] OPENAI_API_KEY missing. Defaulting to stub listener + disabling remote brain/STT."
  );
}

export const runtimeSecrets: RuntimeSecrets = {
  OPENAI_API_KEY: OPENAI_API_KEY || undefined,
  sttEnabled: Boolean(OPENAI_API_KEY),
  llmEnabled: Boolean(OPENAI_API_KEY),
  forceStubListener: !OPENAI_API_KEY,
};

export function maskSecret(value?: string): string {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return `${value.substring(0, 2)}••••${value.substring(value.length - 2)}`;
}
