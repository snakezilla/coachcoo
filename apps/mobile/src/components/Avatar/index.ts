import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Avatar({ anim }: { anim?: string }) {
  // Minimal placeholder avatar. Swap with Lottie later.
  return (
    <View style={styles.bubble}>
      <Text style={styles.face}>🙂</Text>
      <Text style={styles.caption}>{anim ? `Anim: ${anim}` : "Idle"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: "center", justifyContent: "center", padding: 24, borderRadius: 16, borderWidth: 2 },
  face: { fontSize: 64 },
  caption: { marginTop: 8, fontSize: 12 },
});