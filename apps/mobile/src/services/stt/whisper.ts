import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

import { IStt, RecordUntilOptions, RecordUntilResult } from "./index";

export interface WhisperConfig {
  apiKey: string;
  model?: string;
}

const DEFAULT_MODEL = "whisper-1";

export function createWhisperStt(config: WhisperConfig): IStt {
  if (!config.apiKey) {
    throw new Error("createWhisperStt requires an OpenAI API key");
  }

  return {
    async recordUntil(options: RecordUntilOptions): Promise<RecordUntilResult | null> {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Microphone permission denied");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      const abortSignal = options.signal;
      const timeoutMs = options.timeoutMs;

      let abortHandler: (() => void) | undefined;

      try {
        await recording.startAsync();

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, timeoutMs);
          abortHandler = () => {
            clearTimeout(timer);
            const error = new Error("Recording aborted");
            (error as any).name = "AbortError";
            reject(error);
          };
          if (abortSignal) {
            if (abortSignal.aborted) {
              abortHandler();
              return;
            }
            abortSignal.addEventListener("abort", abortHandler, { once: true });
          }
        });
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          throw error;
        }
      } finally {
        try {
          await recording.stopAndUnloadAsync();
        } catch {
          // ignore
        }
        if (abortSignal && abortHandler) {
          abortSignal.removeEventListener("abort", abortHandler);
        }
      }

      if (abortSignal?.aborted) {
        const uriAborted = recording.getURI();
        if (uriAborted) {
          await FileSystem.deleteAsync(uriAborted, { idempotent: true });
        }
        return null;
      }

      const uri = recording.getURI();
      if (!uri) return null;

      try {
        const transcription = await transcribe(uri, config);
        return transcription;
      } finally {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    },
  };
}

async function transcribe(uri: string, config: WhisperConfig): Promise<RecordUntilResult> {
  const model = config.model ?? DEFAULT_MODEL;

  const form = new FormData();
  form.append("file", {
    uri,
    name: "audio.m4a",
    type: "audio/m4a",
  } as any);
  form.append("model", model);
  form.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper transcription failed: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as { text: string; confidence?: number };
  return {
    text: json.text,
    confidence: json.confidence,
  };
}
