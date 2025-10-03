import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

import { IVad, VoiceCallback } from "./index";

const DEFAULT_THRESHOLD_DB = -40;
const DEFAULT_FALLBACK_DB = -160;

export interface RmsVadOptions {
  thresholdDb?: number;
}

export function createRmsVad(options: RmsVadOptions = {}): IVad {
  const listenersStart = new Set<VoiceCallback>();
  const listenersEnd = new Set<VoiceCallback>();
  let recording: Audio.Recording | null = null;
  let voiceActive = false;
  const thresholdDb = options.thresholdDb ?? DEFAULT_THRESHOLD_DB;

  async function start(): Promise<void> {
    if (recording) return;

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("VAD microphone permission denied");
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.LOW_QUALITY,
      isMeteringEnabled: true,
    });
    rec.setOnRecordingStatusUpdate((status) => {
      if (!status.canRecord) return;
      const level = status.metering ?? DEFAULT_FALLBACK_DB;
      const isVoice = level >= thresholdDb;
      if (isVoice && !voiceActive) {
        voiceActive = true;
        listenersStart.forEach((cb) => cb());
      } else if (!isVoice && voiceActive) {
        voiceActive = false;
        listenersEnd.forEach((cb) => cb());
      }
    });

    await rec.startAsync();
    recording = rec;
  }

  async function stop(): Promise<void> {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    const uri = recording.getURI();
    if (uri) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    recording = null;
    voiceActive = false;
  }

  function onVoiceStart(callback: VoiceCallback): () => void {
    listenersStart.add(callback);
    return () => listenersStart.delete(callback);
  }

  function onVoiceEnd(callback: VoiceCallback): () => void {
    listenersEnd.add(callback);
    return () => listenersEnd.delete(callback);
  }

  return {
    start,
    stop,
    onVoiceStart,
    onVoiceEnd,
  };
}
