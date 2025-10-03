import { runtimeSecrets } from "../../config/secrets";
import { remember, recall, logTurn, recentTurns } from "../memory";
import type { ConversationTurn } from "../memory";

const DEFAULT_MODEL = "gpt-4o-mini";
const BASE_PROMPT =
  "You are Coach Coo, an upbeat, neurodiversity-affirming guide. Speak warmly in short sentences (max 20 words). Encourage agency, reflect feelings, and keep things safe.";

function formatMemories(memories: Awaited<ReturnType<typeof recall>>): string | null {
  if (!memories.length) return null;
  const lines = memories.map((memory) => {
    const value = typeof memory.value === "string" ? memory.value : JSON.stringify(memory.value);
    return `- ${memory.key}: ${value}`;
  });
  return `Child notes:\n${lines.join("\n")}`;
}

function toMessages(turns: ConversationTurn[]): { role: "user" | "assistant" | "system"; content: string }[] {
  return turns.map((turn) => ({ role: turn.role, content: turn.text }));
}

function detectMemories(childId: string, text: string): Promise<void>[] {
  const tasks: Promise<void>[] = [];
  const colorMatch = text.match(/favorite color is ([a-z]+)/i);
  if (colorMatch) {
    const color = colorMatch[1];
    tasks.push(remember(childId, "favorite_color", color, 2));
  }
  const nicknameMatch = text.match(/(?:call me|my name is) ([a-z]+)/i);
  if (nicknameMatch) {
    const nickname = nicknameMatch[1];
    tasks.push(remember(childId, "preferred_name", nickname, 2));
  }
  const petMatch = text.match(/(dog|cat|hamster|gecko|pet)/i);
  if (petMatch) {
    tasks.push(remember(childId, "pet", petMatch[1], 1.5));
  }
  return tasks;
}

async function callOpenAi(messages: { role: "user" | "assistant" | "system"; content: string }[]): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtimeSecrets.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 180,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI chat failed: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as {
    choices: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

export async function chat(childId: string, userText: string): Promise<string> {
  const trimmed = userText.trim();
  if (!trimmed) {
    return "I'd love to hear something from you first!";
  }

  await logTurn(childId, "user", trimmed);

  const memoryEntries = await recall(childId, 8);
  const history = await recentTurns(childId, 8);

  const memoryTasks = detectMemories(childId, trimmed);
  if (memoryTasks.length) {
    void Promise.allSettled(memoryTasks);
  }

  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "system", content: BASE_PROMPT },
  ];

  const memoryContext = formatMemories(memoryEntries);
  if (memoryContext) {
    messages.push({ role: "system", content: memoryContext });
  }

  messages.push(...toMessages(history));

  if (!runtimeSecrets.OPENAI_API_KEY) {
    const fallback = `I love hearing that. Let's keep going together!`;
    await logTurn(childId, "assistant", fallback);
    return fallback;
  }

  try {
    const reply = await callOpenAi(messages);
    await logTurn(childId, "assistant", reply);
    const replyMemoryTasks = detectMemories(childId, reply);
    if (replyMemoryTasks.length) {
      void Promise.allSettled(replyMemoryTasks);
    }
    return reply;
  } catch (error) {
    console.warn("[coach-coo] OpenAI chat error", error);
    const fallback = "Thanks for sharing. I'm cheering for you!";
    await logTurn(childId, "assistant", fallback);
    return fallback;
  }
}
