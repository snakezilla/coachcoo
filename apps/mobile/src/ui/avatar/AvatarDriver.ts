export type Emotion = "idle" | "happy" | "encourage" | "thinking";
export type Gesture = "wave" | "confetti" | "thumbsUp";

export type Viseme = { t: number; idx?: number; openness?: number };
export type TtsPlayback = {
  audioUri: string;
  durationMs: number;
  visemes: Viseme[];
};

export interface AvatarDriverHandle {
  setEmotion(e: Emotion): void;
  playGesture(g: Gesture): void;
  startSpeech(v: Viseme[]): void;
  stopSpeech(): void;
  dispose(): void;
}

export type AvatarDriverProps = {
  style?: any;
  debug?: boolean;
};
