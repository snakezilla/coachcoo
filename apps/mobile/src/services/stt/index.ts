export interface RecordUntilOptions {
  timeoutMs: number;
  keywords?: string[];
  signal?: AbortSignal;
}

export interface RecordUntilResult {
  text: string;
  confidence?: number;
}

export interface IStt {
  recordUntil(options: RecordUntilOptions): Promise<RecordUntilResult | null>;
}

export { createWhisperStt } from "./whisper";
export { createStubStt } from "./stub";
