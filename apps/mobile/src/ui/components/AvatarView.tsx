import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import LottieView from "lottie-react-native";

import { LottieAvatarDriver } from "../avatar/LottieAvatarDriver";
import { Emotion } from "../avatar/AvatarDriver";

export type AvatarRef = {
  setEmotion(emotion: Emotion): void;
  speakStart(text: string): void;
  speakStop(): void;
  play(animation: "idle" | "wave" | "clap" | "nod"): void;
};

export interface AvatarViewProps {
  size?: number;
  style?: ViewStyle;
}

const animationSources = {
  idle: require("../../assets/animations/idle.json"),
  talk: require("../../assets/animations/talk.json"),
  celebrate: require("../../assets/animations/celebrate.json"),
  encourage: require("../../assets/animations/encourage.json"),
  thinking: require("../../assets/animations/thinking.json"),
  sad: require("../../assets/animations/idle.json"),
  wave: require("../../assets/animations/encourage.json"),
  clap: require("../../assets/animations/celebrate.json"),
  nod: require("../../assets/animations/thinking.json"),
} as const;

const AvatarView = React.forwardRef<AvatarRef, AvatarViewProps>(({ size = 260, style }, ref) => {
  type LoopAnimation = "idle" | "talk" | "celebrate" | "encourage" | "thinking" | "sad";
  type PlayAnimation = "idle" | "wave" | "clap" | "nod" | "celebrate" | "encourage" | "thinking";

  const [baseAnimation, setBaseAnimation] = React.useState<LoopAnimation>("idle");
  const [activeAnimation, setActiveAnimation] = React.useState<LoopAnimation | PlayAnimation>("idle");
  const [loop, setLoop] = React.useState(true);
  const [iteration, setIteration] = React.useState(0);

  const baseAnimationRef = React.useRef(baseAnimation);
  const loopRef = React.useRef(loop);

  React.useEffect(() => {
    baseAnimationRef.current = baseAnimation;
  }, [baseAnimation]);

  React.useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const setLoopAnimation = React.useCallback((animation: LoopAnimation) => {
    setBaseAnimation(animation);
    setActiveAnimation(animation);
    setLoop(true);
    setIteration((value) => value + 1);
  }, []);

  const playOnce = React.useCallback((animation: PlayAnimation) => {
    setActiveAnimation(animation);
    setLoop(false);
    setIteration((value) => value + 1);
  }, []);

  const driver = React.useMemo(() => new LottieAvatarDriver({ setLoopAnimation, playOnce }), [setLoopAnimation, playOnce]);

  React.useEffect(() => {
    void driver.load();
    return () => {
      void driver.unload();
    };
  }, [driver]);

  React.useImperativeHandle(
    ref,
    () => ({
      setEmotion: (emotion) => driver.setEmotion(emotion),
      speakStart: (text) => driver.speakStart(text),
      speakStop: () => driver.speakStop(),
      play: (animation) => driver.play(animation),
    }),
    [driver]
  );

  const handleAnimationFinish = React.useCallback(() => {
    if (!loopRef.current) {
      setActiveAnimation(baseAnimationRef.current);
      setLoop(true);
      setIteration((value) => value + 1);
    }
  }, []);

  const source = animationSources[activeAnimation as keyof typeof animationSources] ?? animationSources.idle;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        key={iteration}
        source={source}
        autoPlay
        loop={loop}
        style={styles.lottie}
        onAnimationFinish={handleAnimationFinish}
      />
    </View>
  );
});

AvatarView.displayName = "AvatarView";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
});

export default AvatarView;
