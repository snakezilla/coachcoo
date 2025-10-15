import * as React from "react";

import { ADAPTERS } from "../../config";
import { runtimeSecrets } from "../../config/secrets";
import { chat } from "../../services/llm";
import { createStubStt, createWhisperStt, IStt } from "../../services/stt";
import {
  categorizeTranscript,
  CategorizeResult,
  TranscriptTurn,
} from "../../services/analysis";

export type VoiceStatus = "idle" | "listening" | "thinking" | "analyzing" | "error";

export interface VoiceConversationResult {
  userText: string | null;
  assistantText: string | null;
  analysis?: CategorizeResult;
}

export function useVoiceConversation(childId: string) {
  const [turns, setTurns] = React.useState<TranscriptTurn[]>([]);
  const [analysis, setAnalysis] = React.useState<CategorizeResult | null>(null);
  const [status, setStatus] = React.useState<VoiceStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const turnsRef = React.useRef<TranscriptTurn[]>([]);
  React.useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const sttRef = React.useRef<IStt | null>(null);
  React.useEffect(() => {
    if (ADAPTERS.stt === "stub" || !runtimeSecrets.OPENAI_API_KEY) {
      sttRef.current = createStubStt();
    } else {
      try {
        sttRef.current = createWhisperStt({ apiKey: runtimeSecrets.OPENAI_API_KEY });
      } catch (err) {
        console.warn("[coach-coo] Whisper init failed, using stub", err);
        sttRef.current = createStubStt();
      }
    }
  }, []);

  const recordAndRespond = React.useCallback(async (): Promise<VoiceConversationResult> => {
    const stt = sttRef.current;
    if (!stt) {
      const message = "Speech recognition unavailable";
      setError(message);
      setStatus("error");
      return { userText: null, assistantText: null };
    }

    try {
      setError(null);
      setStatus("listening");
      const sttResult = await stt.recordUntil({ timeoutMs: 6000 });
      const userText = sttResult?.text?.trim();

      if (!userText) {
        setStatus("idle");
        return { userText: null, assistantText: null };
      }

      const userTurn: TranscriptTurn = {
        role: "user",
        text: userText,
        timestamp: Date.now(),
      };
      const withUser = [...turnsRef.current, userTurn];
      setTurns(withUser);

      setStatus("thinking");
      const assistantText = await chat(childId, userText);

      const assistantTurn: TranscriptTurn = {
        role: "assistant",
        text: assistantText,
        timestamp: Date.now(),
      };
      const withAssistant = [...withUser, assistantTurn];
      setTurns(withAssistant);

      setStatus("analyzing");
      const categorization = await categorizeTranscript(withAssistant);
      setAnalysis(categorization);
      setStatus("idle");

      return {
        userText,
        assistantText,
        analysis: categorization,
      };
    } catch (err) {
      console.warn("[coach-coo] voice conversation error", err);
      setError((err as Error)?.message ?? "Voice conversation failed");
      setStatus("error");
      return { userText: null, assistantText: null };
    }
  }, [childId]);

  const resetConversation = React.useCallback(() => {
    setTurns([]);
    setAnalysis(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    turns,
    analysis,
    status,
    error,
    recordAndRespond,
    resetConversation,
  };
}
