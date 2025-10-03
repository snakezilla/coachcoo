import Constants from "expo-constants";

export interface RuntimeSecrets {
  OPENAI_API_KEY?: string;
  sttEnabled: boolean;
  llmEnabled: boolean;
  forceStubListener: boolean;
}

function readOpenAiKey(): string {
  const envKey = typeof process.env.EXPO_PUBLIC_OPENAI_KEY === "string" ? process.env.EXPO_PUBLIC_OPENAI_KEY : undefined;
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const configKey = typeof extra?.OPENAI_API_KEY === "string" ? (extra.OPENAI_API_KEY as string) : undefined;
  return (envKey ?? configKey ?? "").trim();
}

export const OPENAI_API_KEY = readOpenAiKey();

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
