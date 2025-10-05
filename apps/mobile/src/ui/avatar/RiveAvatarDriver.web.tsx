import React, { forwardRef, useImperativeHandle } from "react";
import type { AvatarDriverHandle, AvatarDriverProps, Viseme } from "./AvatarDriver";

const RiveAvatarDriver = forwardRef<AvatarDriverHandle, AvatarDriverProps>(({ style }, ref) => {
  useImperativeHandle(ref, () => ({
    setEmotion() {},
    playGesture() {},
    startSpeech(_v: Viseme[]) {},
    stopSpeech() {},
    dispose() {},
  }));

  return (
    <div style={{
      width: 240,
      height: 240,
      borderRadius: 16,
      background: "#e9f1ff",
      border: "1px solid #d6e2ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...(style || {}),
    }}>
      Avatar (web preview)
    </div>
  );
});

RiveAvatarDriver.displayName = "RiveAvatarDriverWeb";

export default RiveAvatarDriver;
