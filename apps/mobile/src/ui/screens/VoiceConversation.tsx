import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AvatarView from "../components/AvatarView";
import type { AvatarDriverHandle } from "../avatar/AvatarDriver";
import { RootStackParamList } from "../navigation/types";
import { useVoiceConversation } from "../hooks/useVoiceConversation";
import { synthesize, playAudio } from "../../services/tts";
import type { CategorizeResult } from "../../services/analysis";

export type VoiceConversationParams = NativeStackScreenProps<RootStackParamList, "VoiceConversation">;

export const VoiceConversationScreen: React.FC<VoiceConversationParams> = ({ route }) => {
  const { childId } = route.params;
  const { turns, analysis, status, error, recordAndRespond } = useVoiceConversation(childId);
  const avatarRef = React.useRef<AvatarDriverHandle>(null);
  const [busy, setBusy] = React.useState(false);

  type SoundHandle = Awaited<ReturnType<typeof playAudio>>["sound"];
  const activeSoundRef = React.useRef<SoundHandle>(null);
  const speechTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPlayback = React.useCallback(async () => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    avatarRef.current?.stopSpeech();
    const sound = activeSoundRef.current;
    if (sound) {
      sound.setOnPlaybackStatusUpdate?.(() => undefined);
      try {
        await sound.stopAsync();
      } catch (err) {
        console.warn("[coach-coo] stopAsync failed", err);
      }
      try {
        await sound.unloadAsync();
      } catch (err) {
        console.warn("[coach-coo] unloadAsync failed", err);
      }
      activeSoundRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    const avatar = avatarRef.current;
    return () => {
      stopPlayback().catch(() => undefined);
      avatar?.dispose();
    };
  }, [stopPlayback]);

  const handleTalk = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    avatarRef.current?.setEmotion("thinking");
    try {
      const result = await recordAndRespond();
      if (result.assistantText) {
        const mood = result.analysis?.mood ?? analysis?.mood;
        avatarRef.current?.setEmotion(emotionFromMood(mood));
        const tts = await synthesize(result.assistantText);
        avatarRef.current?.startSpeech(tts.visemes);
        const { sound } = await playAudio(tts.audioUri);
        activeSoundRef.current = sound ?? null;
        sound?.setOnPlaybackStatusUpdate?.((statusUpdate) => {
          if (!statusUpdate.isLoaded) return;
          if ((statusUpdate as any).didJustFinish) {
            void stopPlayback().finally(() => {
              avatarRef.current?.setEmotion("idle");
            });
          }
        });
        if (speechTimerRef.current) {
          clearTimeout(speechTimerRef.current);
        }
        speechTimerRef.current = setTimeout(() => {
          void stopPlayback().finally(() => {
            avatarRef.current?.setEmotion("idle");
          });
        }, Math.max(500, tts.durationMs + 200));
      } else {
        avatarRef.current?.setEmotion("idle");
      }
    } catch (err) {
      console.warn("[coach-coo] voice talk failed", err);
      Alert.alert("Voice", (err as Error)?.message ?? "Unable to continue conversation.");
      avatarRef.current?.setEmotion("idle");
    } finally {
      setBusy(false);
    }
  }, [analysis?.mood, busy, recordAndRespond, stopPlayback]);

  const statusLabel = statusMap[status] ?? "Ready";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.avatarSection}>
          <AvatarView ref={avatarRef} style={{ width: 260, height: 260 }} />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          style={[styles.talkButton, busy && styles.talkButtonDisabled]}
          onPress={handleTalk}
          disabled={busy}
        >
          <Text style={styles.talkButtonText}>{busy ? "Working…" : "Tap to Talk"}</Text>
        </Pressable>

        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Conversation Insights</Text>
          {analysis ? <Insights analysis={analysis} /> : <Text style={styles.empty}>Start talking to see insights.</Text>}
        </View>

        <View style={styles.transcriptSection}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          <ScrollView style={styles.transcriptScroll} contentContainerStyle={styles.transcriptContent}>
            {turns.map((turn, index) => (
              <View
                key={`${turn.timestamp}-${index}`}
                style={[styles.turnRow, turn.role === "assistant" ? styles.assistantBubble : styles.userBubble]}
              >
                <Text style={styles.turnRole}>{turn.role === "assistant" ? "Coach" : "Child"}</Text>
                <Text style={styles.turnText}>{turn.text}</Text>
              </View>
            ))}
            {!turns.length && <Text style={styles.empty}>No turns yet.</Text>}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const statusMap: Record<string, string> = {
  idle: "Ready to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  analyzing: "Analyzing conversation…",
  error: "Something went wrong",
};

const Insights: React.FC<{ analysis: CategorizeResult }> = ({ analysis }) => {
  return (
    <View style={styles.insightsCard}>
      {analysis.summary ? (
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Summary</Text>
          <Text style={styles.insightValue}>{analysis.summary}</Text>
        </View>
      ) : null}

      <InsightChips label="Topics" values={analysis.topics} />
      <InsightChips label="Action Items" values={analysis.actionItems} />
      <InsightChips label="Safety Flags" values={analysis.safetyFlags} tone="warning" />
      <InsightChips label="Mood" values={analysis.mood ? [analysis.mood] : []} />
    </View>
  );
};

const InsightChips: React.FC<{ label: string; values: string[]; tone?: "warning" }> = ({ label, values, tone }) => {
  if (!values.length) return null;
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {values.map((value) => (
          <Text
            key={value}
            style={[styles.chip, tone === "warning" ? styles.warningChip : undefined]}
          >
            {value}
          </Text>
        ))}
      </View>
    </View>
  );
};

function emotionFromMood(mood?: string): "idle" | "happy" | "encourage" | "thinking" {
  switch (mood) {
    case "positive":
    case "happy":
    case "excited":
      return "happy";
    case "concerned":
    case "neutral":
    case "thoughtful":
      return "thinking";
    case "supportive":
    case "encouraging":
      return "encourage";
    default:
      return "idle";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  avatarSection: {
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    color: "#bfdbfe",
    fontSize: 16,
  },
  error: {
    color: "#fecaca",
    fontSize: 14,
  },
  talkButton: {
    alignSelf: "center",
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  talkButtonDisabled: {
    opacity: 0.6,
  },
  talkButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  analysisSection: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  transcriptSection: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  empty: {
    color: "#94a3b8",
  },
  insightsCard: {
    gap: 12,
  },
  insightRow: {
    gap: 6,
  },
  insightLabel: {
    color: "#cbd5f5",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  insightValue: {
    color: "#f8fafc",
    fontSize: 16,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(37, 99, 235, 0.3)",
    color: "#dbeafe",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 13,
  },
  warningChip: {
    backgroundColor: "rgba(248, 113, 113, 0.2)",
    color: "#fecaca",
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    gap: 12,
  },
  turnRow: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  assistantBubble: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: "rgba(14, 165, 233, 0.25)",
    alignSelf: "flex-end",
  },
  turnRole: {
    fontSize: 12,
    color: "#cbd5f5",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  turnText: {
    color: "#f8fafc",
    fontSize: 16,
  },
});

export default VoiceConversationScreen;
