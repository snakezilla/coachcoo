export type VoiceCallback = () => void;

export interface IVad {
  start(): Promise<void>;
  stop(): Promise<void>;
  onVoiceStart(callback: VoiceCallback): () => void;
  onVoiceEnd(callback: VoiceCallback): () => void;
}

export { createRmsVad } from "./rmsVad";
