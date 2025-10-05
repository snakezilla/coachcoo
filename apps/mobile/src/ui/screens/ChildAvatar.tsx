import React from "react";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";
import AvatarView, { AvatarRef } from "../components/AvatarView";
import { ConfirmBar } from "../components/ConfirmBar";
import { RewardStars } from "../components/RewardStars";
import * as Speech from "expo-speech";
import { useAppStore } from "../../state/store";
import { RoutineRunner, RunnerSnapshot } from "../../engine/runtime/runner";
import { validateRoutine } from "../../engine/runtime/validators";
import { synthesize, playAudio } from "../../services/tts";
import { createWhisperStt, createStubStt } from "../../services/stt";
import { createRmsVad } from "../../services/vad";
import { runtimeSecrets } from "../../config/secrets";
import { ADAPTERS, USE_STUB_LISTENER, LISTEN_TIMEOUT_MS } from "../../config";
import { dbRunnerLogger, endSession, getChildById } from "../../services/db/models";

import morningRoutine from "../../content/packs/morning_v2.json";
import greetingsRoutine from "../../content/packs/greetings_v2.json";

const PACKS_BY_ID = {
  [morningRoutine.id]: morningRoutine,
  [greetingsRoutine.id]: greetingsRoutine,
};

const FALLBACK_CHILD = () => ({
  id: "temp",
  displayName: "Buddy",
  createdAt: Date.now(),
});

type Props = NativeStackScreenProps<RootStackParamList, "ChildAvatar">;

export const ChildAvatarScreen: React.FC<Props> = ({ navigation, route }) => {
  const { routineId, childId, sessionId } = route.params;
  const currentChild = useAppStore((state) => state.currentChild);
  const setCurrentChild = useAppStore((state) => state.setCurrentChild);
  const finishSessionInStore = useAppStore((state) => state.endSession);
  const [snapshot, setSnapshot] = React.useState<RunnerSnapshot | null>(null);
  const [runnerReady, setRunnerReady] = React.useState(false);
  const runnerRef = React.useRef<RoutineRunner | null>(null);
  const completionGuard = React.useRef(false);
  const avatarRef = React.useRef<AvatarRef>(null);
  type SoundHandle = Awaited<ReturnType<typeof playAudio>>["sound"];
  const activeSoundRef = React.useRef<SoundHandle>(null);
  const speechTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechResolveRef = React.useRef<(() => void) | null>(null);

  const clearSpeechTimer = React.useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }, []);

  const cleanupSound = React.useCallback(async () => {
    const sound = activeSoundRef.current;
    if (sound) {
      sound.setOnPlaybackStatusUpdate?.(() => undefined);
      try {
        await sound.stopAsync();
      } catch (error) {
        console.warn("[coach-coo] stopAsync failed", error);
      }
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.warn("[coach-coo] unloadAsync failed", error);
      }
      activeSoundRef.current = null;
    }
  }, []);

  const resolveSpeech = React.useCallback(() => {
    if (speechResolveRef.current) {
      speechResolveRef.current();
      speechResolveRef.current = null;
    }
  }, []);

  const stopPlayback = React.useCallback(async () => {
    clearSpeechTimer();
    Speech.stop();
    await cleanupSound();
    avatarRef.current?.stopSpeech();
    resolveSpeech();
  }, [cleanupSound, clearSpeechTimer, resolveSpeech]);

  const runSpeech = React.useCallback(
    async (text: string) => {
      await stopPlayback();
      if (!text) return;

      try {
        const playback = await synthesize(text);
        avatarRef.current?.startSpeech(playback.visemes);
        const { sound } = await playAudio(playback.audioUri);
        activeSoundRef.current = sound ?? null;

        await new Promise<void>((resolve) => {
          speechResolveRef.current = resolve;
          clearSpeechTimer();
          speechTimerRef.current = setTimeout(() => {
            stopPlayback().catch(() => undefined);
          }, Math.max(500, playback.durationMs + 200));

          sound?.setOnPlaybackStatusUpdate?.((status) => {
            if (!status.isLoaded) return;
            if ((status as any).didJustFinish) {
              stopPlayback().catch(() => undefined);
            }
          });
        });
      } catch (error) {
        console.warn("[coach-coo] Failed to synthesize routine prompt", error);
        resolveSpeech();
      }
    },
    [clearSpeechTimer, stopPlayback, resolveSpeech]
  );

  React.useEffect(() => {
    let active = true;
    const vad = createRmsVad();
    let runner: RoutineRunner | null = null;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const pack = PACKS_BY_ID[routineId];
        if (!pack) {
          Alert.alert("Routine", "Unable to load routine pack.");
          navigation.goBack();
          return;
        }
        const validation = validateRoutine(pack);
        if (!validation.ok) {
          Alert.alert("Routine", validation.errors.join("\n"));
          navigation.goBack();
          return;
        }

        const storeChild = currentChild?.id === childId ? currentChild : undefined;
        const dbChild = storeChild ? undefined : await getChildById(childId);
        const resolvedChild = storeChild
          ? storeChild
          : dbChild
          ? { id: dbChild.id, displayName: dbChild.display_name, createdAt: dbChild.created_at }
          : FALLBACK_CHILD();

        if (!currentChild || currentChild.id !== resolvedChild.id) {
          setCurrentChild(resolvedChild);
        }

        const useStub = USE_STUB_LISTENER || !runtimeSecrets.sttEnabled || ADAPTERS.stt === "stub";
        const tts = {
          speak: runSpeech,
          stop: stopPlayback,
        };
        if (!useStub && !runtimeSecrets.OPENAI_API_KEY) {
          throw new Error("OpenAI API key missing for Whisper STT");
        }
        const stt = useStub
          ? createStubStt()
          : createWhisperStt({ apiKey: runtimeSecrets.OPENAI_API_KEY as string });

        runner = new RoutineRunner(
          {
            sessionId,
            routine: validation.routine,
            childProfile: {
              id: resolvedChild.id,
              displayName: resolvedChild.displayName,
              name: resolvedChild.displayName,
            },
            personalization: {
              child: {
                id: resolvedChild.id,
                name: resolvedChild.displayName,
                displayName: resolvedChild.displayName,
              },
            },
            useStubListener: useStub,
            listenTimeoutMs: LISTEN_TIMEOUT_MS,
          },
          {
            tts,
            stt,
            vad,
            logger: dbRunnerLogger,
          }
        );

        runnerRef.current = runner;
        unsubscribe = runner.subscribe((snap) => {
          if (!active) return;
          setSnapshot(snap);
        });

        await runner.start();
        if (!active) return;
        setRunnerReady(true);
      } catch (error) {
        if (!active) return;
        Alert.alert("Runner", (error as Error)?.message ?? "Failed to start routine");
        navigation.goBack();
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
      void runner?.dispose();
      void vad.stop();
    };
  }, [childId, currentChild, navigation, routineId, runSpeech, sessionId, setCurrentChild, stopPlayback]);

  React.useEffect(() => {
    if (!snapshot) return;
    if (completionGuard.current) return;
    if (snapshot.status === "completed" || snapshot.status === "aborted") {
      completionGuard.current = true;
      const endedAt = Date.now();
      const engagement = snapshot.engagement ?? 0;
      finishSessionInStore(endedAt, engagement);
      void endSession(sessionId, endedAt, engagement).finally(() => {
        navigation.goBack();
      });
    }
  }, [finishSessionInStore, navigation, sessionId, snapshot]);

  const lastCelebrationRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!snapshot) return;
    const avatar = avatarRef.current;
    if (!avatar) return;

    const { status } = snapshot;

    if (status === "prompting") {
      avatar.setEmotion("encourage");
    } else if (status === "listening") {
      avatar.setEmotion("thinking");
    } else if (status === "waiting-confirm") {
      avatar.setEmotion("encourage");
    } else if (status === "completed") {
      avatar.setEmotion("happy");
    } else if (status === "aborted" || status === "error") {
      avatar.setEmotion("thinking");
    } else if (status === "idle") {
      avatar.setEmotion("idle");
    }

  }, [snapshot]);

  React.useEffect(() => {
    const avatar = avatarRef.current;
    return () => {
      stopPlayback().catch(() => undefined);
      avatar?.dispose();
    };
  }, [stopPlayback]);

  React.useEffect(() => {
    if (!snapshot) return;
    const avatar = avatarRef.current;
    if (!avatar) return;

    const celebrateKey = snapshot.celebrateAnim ? `${snapshot.sessionId}-${snapshot.stepIndex}-${snapshot.celebrateAnim}` : undefined;
    if (celebrateKey && lastCelebrationRef.current !== celebrateKey) {
      avatar.setEmotion("happy");
      avatar.playGesture("confetti");
      lastCelebrationRef.current = celebrateKey;
    }

    if (snapshot.lastEventType === "timeout") {
      avatar.setEmotion("thinking");
    }
  }, [snapshot]);

  const runner = runnerRef.current;
  const stepLabel = snapshot ? `Step ${snapshot.stepIndex + 1} / ${snapshot.totalSteps}` : "";
  const statusLabel = describeStatus(snapshot);
  const confirmEnabled = snapshot?.status === "waiting-confirm" || snapshot?.status === "listening";

  if (!runnerReady || !snapshot) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading routine…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.avatarSection}>
        <AvatarView ref={avatarRef} />
        <RewardStars points={snapshot.rewardPoints ?? undefined} sticker={snapshot.rewardSticker ?? undefined} />
      </View>
      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>{stepLabel}</Text>
        <Text style={styles.promptText}>{snapshot.promptText ?? "Listening…"}</Text>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>
      <ConfirmBar
        onConfirm={() => runner?.confirmCurrentStep("manual")}
        onTimeout={() => runner?.timeoutCurrentStep("manual")}
        confirmLabel="All done"
        timeoutLabel="Need help"
        disabled={!confirmEnabled}
      />
    </SafeAreaView>
  );
};

function describeStatus(snapshot: RunnerSnapshot | null): string {
  if (!snapshot) return "";
  switch (snapshot.status) {
    case "prompting":
      return "Coach is speaking";
    case "listening":
      return "We are listening";
    case "waiting-confirm":
      return "Tap when your child finishes or pick timeout.";
    case "completed":
      return "Routine complete!";
    case "aborted":
      return "Session stopped.";
    case "error":
      return snapshot.errorMessage ?? "Error";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  avatarSection: {
    alignItems: "center",
    rowGap: 12,
  },
  promptCard: {
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 24,
    rowGap: 12,
  },
  promptLabel: {
    color: "#94a3b8",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  promptText: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
  },
  statusText: {
    color: "#38bdf8",
    fontSize: 16,
  },
});

export default ChildAvatarScreen;
