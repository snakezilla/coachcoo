// @ts-nocheck
import * as React from "react";
import { View, Text } from "react-native";
import { useRive } from "rive-react-native";

import type { AvatarDriverHandle, AvatarDriverProps, Emotion, Gesture, Viseme } from "./AvatarDriver";
import { CONFIG } from "../../config";

const MACHINE = "AvatarMachine";
const INPUTS = {
  mouthOpen: "mouthOpen",
  visemeIdx: "visemeIdx",
  isTalking: "isTalking",
  emotionIdle: "emotionIdle",
  emotionHappy: "emotionHappy",
  emotionEncourage: "emotionEncourage",
  emotionThinking: "emotionThinking",
  gestureWave: "gestureWave",
  gestureConfetti: "gestureConfetti",
  gestureThumbsUp: "gestureThumbsUp",
} as const;

type InputHandles = Partial<Record<keyof typeof INPUTS, any>>;

const emotionMap: Record<Emotion, keyof typeof INPUTS> = {
  idle: "emotionIdle",
  happy: "emotionHappy",
  encourage: "emotionEncourage",
  thinking: "emotionThinking",
};

function resetEmotionInputs(inputs: InputHandles) {
  (Object.keys(emotionMap) as Emotion[]).forEach((emotion) => {
    const handle = inputs[emotionMap[emotion]];
    if (!handle) return;
    if (typeof handle.fire === "function") {
      handle.fire(false);
    } else if ("value" in handle) {
      handle.value = 0;
    }
  });
}

function setEmotionInput(emotion: Emotion, inputs: InputHandles) {
  const handle = inputs[emotionMap[emotion]];
  if (!handle) return;
  if (typeof handle.fire === "function") {
    handle.fire(true);
  } else if ("value" in handle) {
    handle.value = 1;
  }
}

const RIVE_SRC = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../../assets/rive/coo_avatar.riv");
  } catch (error) {
    console.warn("[coach-coo] Missing Rive avatar asset", error);
    return null;
  }
})();

export const RiveAvatarDriver = React.forwardRef<AvatarDriverHandle, AvatarDriverProps>(
  ({ style }, ref) => {
    const [inputs, setInputs] = React.useState<InputHandles>({});
    const visemeTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const visemeDataRef = React.useRef<Viseme[]>([]);
    const visemeStartRef = React.useRef<number>(0);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    const { rive, RiveComponent } = useRive(
      RIVE_SRC
        ? {
            src: RIVE_SRC,
            autoplay: true,
            stateMachines: MACHINE,
            onLoad: () => {
              try {
                const machineInputs = rive?.stateMachineInputs?.(MACHINE) ?? [];
                const map: InputHandles = {};
                (Object.keys(INPUTS) as (keyof typeof INPUTS)[]).forEach((key) => {
                  const handle = machineInputs.find((item: any) => item.name === INPUTS[key]);
                  if (handle) {
                    map[key] = handle;
                  }
                });
                setInputs(map);
              } catch (error) {
                setLoadError((error as Error).message);
              }
            },
            onError: (event) => {
              const message = typeof event === "string" ? event : (event as Error)?.message;
              setLoadError(message ?? "Failed to load Rive asset");
            },
          }
        : undefined
    );

    const clearVisemeLoop = React.useCallback(() => {
      if (visemeTimerRef.current) {
        clearInterval(visemeTimerRef.current);
        visemeTimerRef.current = null;
      }
      if (inputs.isTalking && "value" in inputs.isTalking) inputs.isTalking.value = 0;
      if (inputs.mouthOpen && "value" in inputs.mouthOpen) inputs.mouthOpen.value = 0;
      if (inputs.visemeIdx && "value" in inputs.visemeIdx) inputs.visemeIdx.value = 0;
    }, [inputs]);

    const setEmotion = React.useCallback(
      (emotion: Emotion) => {
        resetEmotionInputs(inputs);
        setEmotionInput(emotion, inputs);
      },
      [inputs]
    );

    const playGesture = React.useCallback(
      (gesture: Gesture) => {
        const map: Record<Gesture, keyof typeof INPUTS> = {
          wave: "gestureWave",
          confetti: "gestureConfetti",
          thumbsUp: "gestureThumbsUp",
        };
        const handle = inputs[map[gesture]];
        if (!handle) return;
        if (typeof handle.fire === "function") {
          handle.fire();
        } else if ("value" in handle) {
          handle.value = 1;
        }
      },
      [inputs]
    );

    const startSpeech = React.useCallback(
      (visemes: Viseme[]) => {
        clearVisemeLoop();
        if (!visemes?.length) return;
        visemeDataRef.current = visemes;
        visemeStartRef.current = Date.now();
        if (inputs.isTalking && "value" in inputs.isTalking) inputs.isTalking.value = 1;

        visemeTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - visemeStartRef.current;
          let current = visemeDataRef.current[0];
          for (let index = visemeDataRef.current.length - 1; index >= 0; index -= 1) {
            const candidate = visemeDataRef.current[index];
            if (candidate.t <= elapsed) {
              current = candidate;
              break;
            }
          }
          const openness = current.openness ?? (current.idx != null ? Math.min(1, Math.max(0, (current.idx % 4) / 3)) : 0);
          if (inputs.mouthOpen && "value" in inputs.mouthOpen) inputs.mouthOpen.value = openness;
          if (inputs.visemeIdx && current.idx != null && "value" in inputs.visemeIdx) {
            inputs.visemeIdx.value = current.idx;
          }
        }, CONFIG.VISEME_FRAME_MS);
      },
      [clearVisemeLoop, inputs]
    );

    const stopSpeech = React.useCallback(() => {
      clearVisemeLoop();
    }, [clearVisemeLoop]);

    const dispose = React.useCallback(() => {
      clearVisemeLoop();
    }, [clearVisemeLoop]);

    React.useImperativeHandle(ref, () => ({ setEmotion, playGesture, startSpeech, stopSpeech, dispose }), [setEmotion, playGesture, startSpeech, stopSpeech, dispose]);

    React.useEffect(() => () => clearVisemeLoop(), [clearVisemeLoop]);

    if (!RIVE_SRC || loadError) {
      const message = !RIVE_SRC ? "Add src/assets/rive/coo_avatar.riv" : `Rive error: ${loadError}`;
      return (
        <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
          <Text style={{ fontSize: 64 }}>🕹️</Text>
          <Text style={{ marginTop: 8, opacity: 0.7, textAlign: "center" }}>{message}</Text>
        </View>
      );
    }

    return <RiveComponent style={style} />;
  }
);

RiveAvatarDriver.displayName = "RiveAvatarDriver";
