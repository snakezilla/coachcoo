import React from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import Avatar from "../components/Avatar";
import ConfirmBar from "../components/ConfirmBar";
import greetings from "../content/packs/greetings_v1.json";
import { CONFIG } from "../config";
import type { Routine } from "../engine/stateMachine";
import { Runner, computeEngagement } from "../engine/runner";
import { createSession, endSession, logEvent } from "../services/db";
import { StubListener } from "../services/listener";

type Props = NativeStackScreenProps<RootStackParamList, "ChildAvatar">;

export default function ChildAvatar({ route, navigation }: Props) {
  const { routineId, childId } = route.params;

  const routine =
    route.params.routineId === "greetings_v1" ? (greetings as any) :
    route.params.routineId === "morning_v1"   ? (require("../content/packs/morning_v1.json") as any) :
    (require("../content/packs/morning_v1.json") as any);

  const typedRoutine = routine as Routine;

  const [runner, setRunner] = React.useState<Runner | null>(null);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [heardCount, setHeardCount] = React.useState(0);
  const [sessionId] = React.useState(() => Math.random().toString(36).slice(2));
  const [listenToken, setListenToken] = React.useState(0);

  const listenerRef = React.useRef<StubListener | null>(null);
  const listenTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoConfirmTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCadence = React.useCallback(() => {
    if (listenTimerRef.current) {
      clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    if (autoConfirmTimerRef.current) {
      clearTimeout(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
    if (listenerRef.current) {
      listenerRef.current.stop().catch((err) => console.error("Listener stop failed", err));
      listenerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    clearCadence();
    const runnerInstance = new Runner(typedRoutine, sessionId);
    setRunner(runnerInstance);
    setStepIdx(0);
    setHeardCount(0);
    setListenToken(0);
    let disposed = false;

    (async () => {
      try {
        await createSession({ id: sessionId, child_id: childId, routine_id: typedRoutine.id, started_at: Date.now() });
        await runnerInstance.start();
        if (!disposed) {
          setListenToken((x) => x + 1);
        }
      } catch (err) {
        console.error("Failed to start routine", err);
      }
    })();

    return () => {
      disposed = true;
      clearCadence();
    };
  }, [childId, sessionId, typedRoutine, clearCadence]);

  const finish = React.useCallback(async (finalHeardCount: number) => {
    clearCadence();
    const total = typedRoutine.steps.length;
    const engagement = computeEngagement(total, finalHeardCount);
    await endSession(sessionId, Date.now(), engagement);
    navigation.goBack();
  }, [clearCadence, navigation, sessionId, typedRoutine]);

  const handleConfirm = React.useCallback(async (source: "manual" | "auto") => {
    if (!runner) return;
    clearCadence();
    const stepId = runner.currentStep?.id ?? "unknown";
    await runner.confirmHeard();
    await logEvent({
      id: Math.random().toString(36).slice(2),
      session_id: sessionId, ts: Date.now(), step_id: stepId,
      type: "confirm", value: { confirmed: true, source }
    });
    const nextHeard = heardCount + 1;
    setHeardCount(nextHeard);
    setStepIdx((i) => Math.min(i + 1, typedRoutine.steps.length));
    if (runner.currentState === "END") {
      await finish(nextHeard);
    } else {
      setListenToken((x) => x + 1);
    }
  }, [clearCadence, finish, heardCount, runner, sessionId, typedRoutine]);

  const handleTimeout = React.useCallback(async (source: "manual" | "auto") => {
    if (!runner) return;
    clearCadence();
    const stepId = runner.currentStep?.id ?? "unknown";
    await runner.timeout();
    await logEvent({
      id: Math.random().toString(36).slice(2),
      session_id: sessionId, ts: Date.now(), step_id: stepId,
      type: "timeout", value: { source }
    });
    setStepIdx((i) => Math.min(i + 1, typedRoutine.steps.length));
    if (runner.currentState === "END") {
      await finish(heardCount);
    } else {
      setListenToken((x) => x + 1);
    }
  }, [clearCadence, finish, heardCount, runner, sessionId, typedRoutine]);

  React.useEffect(() => {
    if (!runner || listenToken === 0) return;
    if (runner.currentState === "END") {
      clearCadence();
      return;
    }

    clearCadence();
    const listener = new StubListener();
    listenerRef.current = listener;
    listener.start().catch((err) => console.error("Listener start failed", err));

    if (CONFIG.LISTEN_TIMEOUT_MS > 0) {
      listenTimerRef.current = setTimeout(() => {
        handleTimeout("auto").catch((err) => console.error("Auto timeout failed", err));
      }, CONFIG.LISTEN_TIMEOUT_MS);
    }

    if (CONFIG.AUTO_CONFIRM_AFTER_MS > 0) {
      autoConfirmTimerRef.current = setTimeout(() => {
        handleConfirm("auto").catch((err) => console.error("Auto confirm failed", err));
      }, CONFIG.AUTO_CONFIRM_AFTER_MS);
    }

    return () => {
      clearCadence();
    };
  }, [runner, listenToken, clearCadence, handleConfirm, handleTimeout]);

  if (!runner) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading routine…</Text>
      </View>
    );
  }

  const step = runner.currentStep;
  const totalSteps = typedRoutine.steps.length;
  return (
    <View style={{ flex: 1, padding: 16, gap: 16, justifyContent: "center", alignItems: "center" }}>
      <Avatar anim={step?.prompt?.anim} />
      <Text style={{ fontSize: 16 }}>Step {Math.min(stepIdx + 1, totalSteps)} / {totalSteps}</Text>
      <ConfirmBar
        onConfirm={() => { void handleConfirm("manual"); }}
        onTimeout={() => { void handleTimeout("manual"); }}
      />
      <Button title="End Session" onPress={() => { void finish(heardCount); }} />
    </View>
  );
}
