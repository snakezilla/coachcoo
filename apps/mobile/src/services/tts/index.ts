import { Audio } from "expo-av";

import { CONFIG } from "../../config";
import { synthesizeElevenLabs } from "./providers/elevenlabs";
import { synthesizeStub } from "./providers/stub";
import type { TtsPlayback } from "./types";

export type { Viseme, TtsPlayback } from "./types";
export { synthesizeElevenLabs, synthesizeStub };

export async function synthesize(text: string): Promise<TtsPlayback> {
  if (CONFIG.TTS_PROVIDER === "elevenlabs") {
    try {
      return await synthesizeElevenLabs(text);
    } catch (error) {
      console.warn("[coach-coo] ElevenLabs TTS failed, falling back to stub", error);
    }
  }

  return synthesizeStub(text);
}

export async function playAudio(uri: string | null): Promise<{ sound: Audio.Sound | null }> {
  if (!uri) {
    return { sound: null };
  }

  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  return { sound };
}
