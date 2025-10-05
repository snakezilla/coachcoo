import * as FileSystem from "expo-file-system/legacy";

import { SECRETS } from "../../../config/secrets";
import type { TtsPlayback, Viseme } from "../types";

const MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary);
  }

  const g = globalThis as unknown as { Buffer?: { from(data: Uint8Array): { toString(encoding: string): string } } };
  if (g.Buffer) {
    return g.Buffer.from(bytes).toString("base64");
  }

  throw new Error("Base64 encoding unavailable in this runtime");
}

function buildFallbackVisemes(text: string): Viseme[] {
  const normalized = text.trim() || "Hello from ElevenLabs";
  const syllables = Math.max(4, Math.ceil(normalized.length / 3));
  const beat = 90;
  const visemes: Viseme[] = [];

  for (let index = 0; index < syllables; index += 1) {
    visemes.push({ t: index * beat, openness: index % 2 === 0 ? 0.85 : 0.15, idx: index % 4 });
  }

  return visemes;
}

export async function synthesizeElevenLabs(text: string): Promise<TtsPlayback> {
  if (!SECRETS.ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY");
  }

  const voiceId = SECRETS.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": SECRETS.ELEVENLABS_API_KEY,
      accept: "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${message}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("expo-file-system cache directory unavailable");
  }
  const filename = `${baseDir}tts_${Date.now()}.mp3`;

  await FileSystem.writeAsStringAsync(filename, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const visemes = buildFallbackVisemes(text);
  const durationMs = (visemes[visemes.length - 1]?.t ?? 0) + 400;

  return {
    audioUri: filename,
    durationMs,
    visemes,
  };
}
