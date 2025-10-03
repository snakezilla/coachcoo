import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { runtimeSecrets, maskSecret } from "../../config/secrets";
import { ADAPTERS, USE_STUB_LISTENER, AUTO_CONFIRM_AFTER_MS, LISTEN_TIMEOUT_MS } from "../../config";

export const SettingsScreen: React.FC = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>OpenAI API key</Text>
        <Text style={styles.cardValue}>{maskSecret(runtimeSecrets.OPENAI_API_KEY)}</Text>
        <Text style={styles.caption}>
          Speech recognition {runtimeSecrets.sttEnabled ? "enabled" : "disabled"}. Brain {runtimeSecrets.llmEnabled ? "enabled" : "disabled"}.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Adapters</Text>
        <Text style={styles.cardValue}>TTS: {ADAPTERS.tts}</Text>
        <Text style={styles.cardValue}>STT: {ADAPTERS.stt}</Text>
        <Text style={styles.cardValue}>VAD: {ADAPTERS.vad}</Text>
        <Text style={styles.cardValue}>Brain: {ADAPTERS.brain}</Text>
        <Text style={styles.caption}>
          Listener stub {USE_STUB_LISTENER ? "active" : "off"}. Adjust in src/config/index.ts.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Timing</Text>
        <Text style={styles.cardValue}>Listen timeout: {Math.round(LISTEN_TIMEOUT_MS / 1000)}s</Text>
        <Text style={styles.cardValue}>Auto confirm: {Math.round(AUTO_CONFIRM_AFTER_MS / 1000)}s</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    rowGap: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    rowGap: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 16,
  },
  caption: {
    fontSize: 12,
    color: "#64748b",
  },
});

export default SettingsScreen;
