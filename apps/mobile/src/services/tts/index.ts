export interface TtsSpeakOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
}

export interface ITts {
  speak(text: string, options?: TtsSpeakOptions): Promise<void>;
  stop(): Promise<void> | void;
}

export { createExpoTts } from "./expoTts";
