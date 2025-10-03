import * as Speech from "expo-speech";

import { ITts, TtsSpeakOptions } from "./index";

export function createExpoTts(): ITts {
  let currentResolve: (() => void) | null = null;

  async function stop(): Promise<void> {
    if (currentResolve) {
      currentResolve();
      currentResolve = null;
    }
    Speech.stop();
  }

  async function speak(text: string, options?: TtsSpeakOptions): Promise<void> {
    await stop();
    return new Promise<void>((resolve) => {
      if (!text) {
        resolve();
        return;
      }
      currentResolve = resolve;
      Speech.speak(text, {
        voice: options?.voice,
        rate: options?.rate,
        pitch: options?.pitch,
        onDone: () => {
          currentResolve?.();
          currentResolve = null;
        },
        onStopped: () => {
          currentResolve?.();
          currentResolve = null;
        },
        onError: () => {
          currentResolve?.();
          currentResolve = null;
        },
      });
    });
  }

  return {
    speak,
    stop,
  };
}
