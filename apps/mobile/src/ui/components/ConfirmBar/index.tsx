import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export interface ConfirmBarProps {
  onConfirm(): void;
  onTimeout(): void;
  confirmLabel?: string;
  timeoutLabel?: string;
  disabled?: boolean;
}

export const ConfirmBar: React.FC<ConfirmBarProps> = ({
  onConfirm,
  onTimeout,
  confirmLabel = "Got it",
  timeoutLabel = "Timeout",
  disabled = false,
}) => {
  const handlePress = (action: () => void, style: "success" | "warning") => {
    if (disabled) return;
    void Haptics.impactAsync(
      style === "success" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    action();
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        style={[styles.button, styles.confirm, disabled && styles.disabled]}
        onPress={() => handlePress(onConfirm, "success")}
      >
        <Text style={styles.buttonText}>{confirmLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={[styles.button, styles.timeout, disabled && styles.disabled]}
        onPress={() => handlePress(onTimeout, "warning")}
      >
        <Text style={styles.buttonText}>{timeoutLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    columnGap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirm: {
    backgroundColor: "#3b82f6",
  },
  timeout: {
    backgroundColor: "#f97316",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  disabled: {
    opacity: 0.5,
  },
});
