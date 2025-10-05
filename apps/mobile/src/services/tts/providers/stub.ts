import * as Speech from "expo-speech";

import type { TtsPlayback, Viseme } from "../types";

const SYLLABLE_MS = 140;

function buildVisemes(text: string): Viseme[] {
  const words = (text || "hello from stub").split(/\s+/).filter(Boolean);
  const visemes: Viseme[] = [];
  let cursor = 0;

  for (const word of words) {
    const beats = Math.max(1, Math.ceil(word.length / 3));
    for (let index = 0; index < beats; index += 1) {
      visemes.push({ t: cursor, openness: 0.8 });
      cursor += SYLLABLE_MS * 0.5;
      visemes.push({ t: cursor, openness: 0.15 });
      cursor += SYLLABLE_MS * 0.5;
    }
  }

  if (visemes.length === 0) {
    visemes.push({ t: 0, openness: 0 });
  }

  return visemes;
}

export async function synthesizeStub(text: string): Promise<TtsPlayback> {
  const visemes = buildVisemes(text);
  Speech.stop();
  Speech.speak(text, { rate: 1, onError: console.warn });
  const endMs = (visemes[visemes.length - 1]?.t ?? 0) + SYLLABLE_MS;

  return {
    audioUri: "",
    durationMs: endMs,
    visemes,
  };
}
