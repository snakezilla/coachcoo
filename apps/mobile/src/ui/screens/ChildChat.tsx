import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AvatarView, { AvatarRef } from "../components/AvatarView";
import { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../../state/store";
import { recentTurns } from "../../services/memory";
import type { ConversationTurn } from "../../services/memory";
import { chat } from "../../services/llm";
import { createExpoTts } from "../../services/tts";

const BUTTON_LABEL = "Talk";

export type ChildChatParams = NativeStackScreenProps<RootStackParamList, "ChildChat">;

export const ChildChatScreen: React.FC<ChildChatParams> = ({ route }) => {
  const { childId } = route.params;
  const childProfile = useAppStore((state) =>
    state.currentChild && state.currentChild.id === childId ? state.currentChild : undefined
  );
  const avatarRef = React.useRef<AvatarRef>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const tts = React.useMemo(() => createExpoTts(), []);

  const [messages, setMessages] = React.useState<ConversationTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const loadHistory = React.useCallback(async () => {
    const turns = await recentTurns(childId, 20);
    setMessages(turns);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [childId]);

  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  React.useEffect(() => {
    return () => {
      void tts.stop?.();
    };
  }, [tts]);

  const handleSend = React.useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setInput("");

    const userTurn: ConversationTurn = {
      id: `local-${Date.now()}`,
      ts: Date.now(),
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userTurn]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });

    avatarRef.current?.setEmotion("thinking");

    try {
      const reply = await chat(childId, trimmed);
      await loadHistory();

      avatarRef.current?.speakStop();
      avatarRef.current?.speakStart(reply);
      await tts.speak(reply);
      avatarRef.current?.speakStop();
      avatarRef.current?.setEmotion("encourage");
    } catch (error) {
      console.warn("[coach-coo] chat send error", error);
      Alert.alert("Chat", (error as Error)?.message ?? "Unable to chat right now.");
    } finally {
      setPending(false);
    }
  }, [avatarRef, childId, input, loadHistory, pending, tts]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.avatarContainer}>
          <AvatarView ref={avatarRef} />
          <Text style={styles.subtitle}>
            {childProfile ? `${childProfile.displayName}'s chat` : "Chat mode"}
          </Text>
        </View>
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === "assistant" ? styles.assistantBubble : styles.userBubble,
              ]}
            >
              <Text style={styles.messageRole}>{message.role === "assistant" ? "Coach" : "You"}</Text>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Say something to Coach Coo"
            value={input}
            onChangeText={setInput}
            editable={!pending}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            style={[styles.talkButton, pending && styles.disabledButton]}
            onPress={handleSend}
            disabled={pending}
          >
            <Text style={styles.talkButtonText}>{pending ? "Listening..." : BUTTON_LABEL}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  avatarContainer: {
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
  messages: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#1e293b",
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    borderRadius: 16,
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
  messageRole: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#cbd5f5",
  },
  messageText: {
    fontSize: 16,
    color: "#f1f5f9",
  },
  inputRow: {
    borderRadius: 18,
    backgroundColor: "#1e293b",
    padding: 12,
    gap: 12,
  },
  input: {
    minHeight: 60,
    maxHeight: 120,
    color: "#f8fafc",
    fontSize: 16,
  },
  talkButton: {
    alignSelf: "center",
    backgroundColor: "#2563eb",
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  talkButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ChildChatScreen;
