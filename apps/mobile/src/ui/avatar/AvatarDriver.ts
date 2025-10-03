export type Emotion = "neutral" | "happy" | "encourage" | "thinking" | "celebrate" | "sad";

export interface AvatarDriver {
  load(): Promise<void>;
  setEmotion(emotion: Emotion): void;
  speakStart(text: string): void;
  speakStop(): void;
  play(animation: "idle" | "wave" | "clap" | "nod"): void;
  unload(): Promise<void>;
}
