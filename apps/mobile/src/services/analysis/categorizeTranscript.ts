import { runtimeSecrets } from "../../config/secrets";

export type TranscriptRole = "user" | "assistant";

export interface TranscriptTurn {
  role: TranscriptRole;
  text: string;
  timestamp: number;
}

export interface CategorizeResult {
  summary: string;
  topics: string[];
  mood: string;
  actionItems: string[];
  safetyFlags: string[];
  raw?: string;
}

const FALLBACK_RESULT: CategorizeResult = {
  summary: "",
  topics: [],
  mood: "neutral",
  actionItems: [],
  safetyFlags: [],
};

export async function categorizeTranscript(turns: TranscriptTurn[]): Promise<CategorizeResult> {
  if (!turns.length) return FALLBACK_RESULT;

  if (!runtimeSecrets.OPENAI_API_KEY) {
    return heuristicCategorize(turns);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runtimeSecrets.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a conversation analyst helping caregivers understand chats with children. Produce JSON with keys summary, topics (array of short strings), mood (one word), action_items (array), and safety_flags (array describing concerning patterns).",
          },
          {
            role: "user",
            content: buildTranscriptPayload(turns),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Categorize transcript failed: ${response.status} ${errorText}`);
    }

    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty categorize response");

    const parsed = JSON.parse(content);
    return {
      summary: String(parsed.summary ?? "").trim(),
      topics: normalizeArray(parsed.topics),
      mood: String(parsed.mood ?? "neutral").toLowerCase(),
      actionItems: normalizeArray(parsed.action_items),
      safetyFlags: normalizeArray(parsed.safety_flags),
      raw: content,
    };
  } catch (error) {
    console.warn("[coach-coo] categorize transcript fallback", error);
    return heuristicCategorize(turns);
  }
}

function buildTranscriptPayload(turns: TranscriptTurn[]): string {
  const lines = turns.map((turn) => {
    const time = new Date(turn.timestamp).toISOString();
    return `[${time}] ${turn.role.toUpperCase()}: ${turn.text}`;
  });
  return `Transcript:\n${lines.join("\n")}`;
}

function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function heuristicCategorize(turns: TranscriptTurn[]): CategorizeResult {
  const text = turns.map((turn) => turn.text.toLowerCase()).join(" ");
  const topics = new Set<string>();

  const keywordTopics: Record<string, string> = {
    homework: "school",
    school: "school",
    math: "school",
    science: "school",
    friend: "relationships",
    friends: "relationships",
    play: "play",
    game: "play",
    sleep: "wellness",
    tired: "wellness",
    feeling: "emotions",
    happy: "emotions",
    sad: "emotions",
    mad: "emotions",
  };

  Object.entries(keywordTopics).forEach(([keyword, bucket]) => {
    if (text.includes(keyword)) topics.add(bucket);
  });

  let mood = "neutral";
  if (/happy|great|awesome|yay/.test(text)) mood = "positive";
  else if (/sad|tired|bad|upset/.test(text)) mood = "concerned";

  const actionItems: string[] = [];
  if (/homework|study/.test(text)) actionItems.push("support with schoolwork");
  if (/sleep|bed|rest/.test(text)) actionItems.push("check bedtime routine");
  if (/friend|bully/.test(text)) actionItems.push("discuss friendships");

  const safetyFlags: string[] = [];
  if (/hurt|hit|danger|unsafe/.test(text)) safetyFlags.push("Possible safety concern mentioned");

  const summary = turns
    .slice(-4)
    .map((turn) => `${turn.role === "assistant" ? "Coach" : "Child"}: ${turn.text}`)
    .join(" ");

  return {
    summary,
    topics: Array.from(topics),
    mood,
    actionItems,
    safetyFlags,
  };
}
