import { Prompt } from "../stateMachine/types";

export interface PersonalizationChild {
  id?: string;
  name?: string;
  displayName?: string;
  nickname?: string;
}

export interface PersonalizationContext {
  child?: PersonalizationChild;
  routineId?: string;
  sessionId?: string;
  extra?: Record<string, unknown>;
}

const SLOT_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

export function personalizeText(text: string | undefined, ctx: PersonalizationContext): string {
  if (!text) return "";
  return text.replace(SLOT_PATTERN, (_, rawKey) => {
    const value = resolvePath(ctx, rawKey.trim());
    return value == null ? "" : String(value);
  });
}

export function pickPromptText(prompt: Prompt, ctx: PersonalizationContext): string {
  const variantText = chooseVariant(prompt);
  if (variantText) return personalizeText(variantText, ctx);
  return personalizeText(prompt.tts, ctx);
}

function chooseVariant(prompt: Prompt): string | undefined {
  const variants = prompt.ttsVariants;
  if (!variants?.length) return undefined;
  const totalWeight = variants.reduce((acc, item) => acc + (item.weight ?? 1), 0);
  if (totalWeight <= 0) return variants[0].text;
  const target = Math.random() * totalWeight;
  let cumulative = 0;
  for (const item of variants) {
    cumulative += item.weight ?? 1;
    if (target <= cumulative) return item.text;
  }
  return variants[variants.length - 1]?.text;
}

function resolvePath(ctx: PersonalizationContext, key: string): unknown {
  const parts = key.split(".");
  let current: any = ctx;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}
