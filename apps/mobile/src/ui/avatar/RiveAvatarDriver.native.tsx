// @ts-nocheck
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Rive, { RiveRef } from "rive-react-native";
import type { AvatarDriverHandle, AvatarDriverProps, Viseme } from "./AvatarDriver";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RIVE_RESOURCE = require("../../assets/rive/coo_avatar.riv");

const EMOTION_TO_ANIM: Record<string, string> = {
  idle: "Idle",
  happy: "Happy",
  encourage: "Encourage",
  thinking: "Thinking",
};
const GESTURE_TO_ANIM: Record<string, string> = {
  wave: "Wave",
  confetti: "Confetti",
  thumbsUp: "ThumbsUp",
};

const RiveAvatarDriver = forwardRef<AvatarDriverHandle, AvatarDriverProps>(
  ({ style, debug }, ref) => {
    const riveRef = useRef<RiveRef>(null);

    useImperativeHandle(ref, () => ({
      setEmotion(e) {
        const anim = EMOTION_TO_ANIM[e] ?? "Idle";
        riveRef.current?.play(anim, { loop: true });
        if (debug) console.log("[avatar] emotion →", e);
      },
      playGesture(g) {
        const anim = GESTURE_TO_ANIM[g];
        if (anim) riveRef.current?.play(anim, { loop: false, mix: 0.2 });
        if (debug) console.log("[avatar] gesture →", g);
      },
      startSpeech(visemes: Viseme[]) {
        // Basic mouth open/close using a numeric input named “Mouth”
        let i = 0;
        const tick = () => {
          const v = visemes[i++];
          if (!v) return;
          riveRef.current?.setInput("Mouth", v.openness ?? 0.5);
          requestAnimationFrame(tick);
        };
        tick();
        riveRef.current?.play("Talk", { loop: true });
      },
      stopSpeech() {
        riveRef.current?.setInput("Mouth", 0);
        riveRef.current?.play("Idle", { loop: true });
      },
      dispose() {},
    }));

    useEffect(() => {
      riveRef.current?.play("Idle", { loop: true });
    }, []);

    return (
      <View style={[styles.wrap, style]}>
        <Rive ref={riveRef} resourceName={RIVE_RESOURCE} artboardName="Avatar" animationName="Idle" />
      </View>
    );
  }
);

RiveAvatarDriver.displayName = "RiveAvatarDriverNative";

const styles = StyleSheet.create({ wrap: { width: 240, height: 240 } });
export default RiveAvatarDriver;
