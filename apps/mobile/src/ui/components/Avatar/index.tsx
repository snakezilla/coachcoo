import React from "react";
import { StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";

const animationMap = {
  idle: require("../../../assets/animations/idle.json"),
  clap: require("../../../assets/animations/clap.json"),
  confetti: require("../../../assets/animations/confetti.json"),
  point_right: require("../../../assets/animations/point_right.json"),
} as const;

export type AvatarAnimation = keyof typeof animationMap;

export interface AvatarProps {
  anim?: AvatarAnimation;
  size?: number;
  fallbackEmoji?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ anim = "idle", size = 240, fallbackEmoji = "🙂" }) => {
  const source = animationMap[anim];
  if (!source) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}> 
        <Text style={styles.fallbackText}>{fallbackEmoji}</Text>
      </View>
    );
  }

  return <LottieView source={source} autoPlay loop style={{ width: size, height: size }} />;
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontSize: 64,
  },
});
