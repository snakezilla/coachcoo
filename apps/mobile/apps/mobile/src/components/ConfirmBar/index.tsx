import React from "react";
import { View, Button, StyleSheet } from "react-native";

export default function ConfirmBar({
  onConfirm,
  onTimeout,
}: { onConfirm: () => void; onTimeout: () => void }) {
  return (
    <View style={styles.row}>
      <Button title="✓ Heard" onPress={onConfirm} />
      <Button title="Skip/Timeout" onPress={onTimeout} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, justifyContent: "center", marginTop: 16 },
});
