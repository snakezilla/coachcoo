import * as React from "react";
import { Platform, View, StyleSheet, StyleProp, ViewStyle } from "react-native";

import { RiveAvatarDriver } from "../avatar/RiveAvatarDriver";
import type { AvatarDriverHandle } from "../avatar/AvatarDriver";

export type AvatarRef = AvatarDriverHandle;

type AvatarViewProps = {
  style?: StyleProp<ViewStyle>;
};

const AvatarView = React.forwardRef<AvatarDriverHandle, AvatarViewProps>(({ style }, ref) => {
  const mergedStyle = React.useMemo(() => [{ width: 260, height: 260 }, style], [style]);

  // On web the canvas can swallow clicks; disable pointer events on the animation layer.
  const innerPointerEvents: "none" | "auto" = Platform.OS === "web" ? "none" : "auto";

  return (
    <View style={mergedStyle} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents={innerPointerEvents}>
        <RiveAvatarDriver ref={ref} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
});

AvatarView.displayName = "AvatarView";

export default AvatarView;