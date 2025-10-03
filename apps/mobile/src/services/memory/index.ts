import { exec, query } from "../db";
import { safeStringify, safeParse } from "../../lib/json";
import { nanoId } from "../../lib/id";

interface MemoryRow {
  key: string;
  value: string;
  score: number;
  updated_at: number;
}

interface ConvoRow {
  id: string;
  ts: number;
  role: "user" | "assistant" | "system";
  text: string;
}

export interface MemoryItem {
  key: string;
  value: unknown;
  score: number;
  updatedAt: number;
}

export interface ConversationTurn {
  id: string;
  ts: number;
  role: "user" | "assistant" | "system";
  text: string;
}

export async function remember(childId: string, key: string, value: unknown, score = 1): Promise<void> {
  const now = Date.now();
  await exec(
    `INSERT INTO memory(child_id, key, value, score, updated_at)
     VALUES(?,?,?,?,?)
     ON CONFLICT(child_id, key)
     DO UPDATE SET
       value=excluded.value,
       score=memory.score + excluded.score,
       updated_at=excluded.updated_at`,
    [childId, key, safeStringify(value), score, now]
  );
}

export async function recall(childId: string, max = 8): Promise<MemoryItem[]> {
  const rows = await query<MemoryRow>(
    `SELECT key, value, score, updated_at FROM memory WHERE child_id=? ORDER BY score DESC, updated_at DESC LIMIT ?`,
    [childId, max]
  );
  return rows.map((row) => ({
    key: row.key,
    value: safeParse(row.value),
    score: row.score,
    updatedAt: row.updated_at,
  }));
}

export async function logTurn(
  childId: string,
  role: "user" | "assistant" | "system",
  text: string
): Promise<ConversationTurn> {
  const id = nanoId();
  const ts = Date.now();
  await exec(
    `INSERT INTO convo(child_id, id, ts, role, text) VALUES(?,?,?,?,?)`,
    [childId, id, ts, role, text]
  );
  return { id, ts, role, text };
}

export async function recentTurns(childId: string, limit = 12): Promise<ConversationTurn[]> {
  const rows = await query<ConvoRow>(
    `SELECT id, ts, role, text FROM convo WHERE child_id=? ORDER BY ts DESC LIMIT ?`,
    [childId, limit]
  );
  return rows.reverse();
}
