import { AvatarDriver, Emotion } from "./AvatarDriver";

type LoopAnimation = "idle" | "talk" | "celebrate" | "encourage" | "thinking" | "sad";
type PlayAnimation = "idle" | "wave" | "clap" | "nod" | "celebrate" | "encourage" | "thinking";

type AnimationController = {
  setLoopAnimation: (animation: LoopAnimation) => void;
  playOnce: (animation: PlayAnimation) => void;
};

const emotionToAnimation: Record<Emotion, LoopAnimation> = {
  neutral: "idle",
  happy: "celebrate",
  encourage: "encourage",
  thinking: "thinking",
  celebrate: "celebrate",
  sad: "sad",
};

export class LottieAvatarDriver implements AvatarDriver {
  private readonly controls: AnimationController;
  private loaded = false;
  private speaking = false;
  private currentEmotion: Emotion = "neutral";

  constructor(controls: AnimationController) {
    this.controls = controls;
  }

  async load(): Promise<void> {
    this.loaded = true;
    this.controls.setLoopAnimation("idle");
  }

  setEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion;
    if (!this.loaded) return;
    if (this.speaking) return;
    const animation = emotionToAnimation[emotion] ?? "idle";
    this.controls.setLoopAnimation(animation);
  }

  speakStart(_text: string): void {
    if (!this.loaded) return;
    this.speaking = true;
    this.controls.setLoopAnimation("talk");
  }

  speakStop(): void {
    if (!this.loaded) return;
    if (!this.speaking) return;
    this.speaking = false;
    const animation = emotionToAnimation[this.currentEmotion] ?? "idle";
    this.controls.setLoopAnimation(animation);
  }

  play(animation: "idle" | "wave" | "clap" | "nod"): void {
    if (!this.loaded) return;
    // Map simple gestures to the available assets.
    const mapped: PlayAnimation =
      animation === "wave"
        ? "encourage"
        : animation === "clap"
        ? "celebrate"
        : animation === "nod"
        ? "thinking"
        : "idle";
    this.controls.playOnce(mapped);
  }

  async unload(): Promise<void> {
    this.loaded = false;
    this.speaking = false;
  }
}
