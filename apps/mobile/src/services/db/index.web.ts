// Web-only in-memory DB stub to avoid expo-sqlite wasm on web builds.

export type Row = Record<string, any>;

interface ChildRow {
  id: string;
  display_name: string;
  created_at: number;
}

interface SessionRow {
  id: string;
  child_id: string;
  routine_id: string;
  started_at: number;
  ended_at: number | null;
  engagement: number | null;
  notes: string | null;
}

interface EventRow {
  id: string;
  session_id: string;
  routine_id: string;
  ts: number;
  step_id: string | null;
  type: string;
  value_json: string | null;
}

interface MemoryRow {
  child_id: string;
  key: string;
  value: string;
  score: number;
  updated_at: number;
}

interface ConvoRow {
  child_id: string;
  id: string;
  ts: number;
  role: string;
  text: string;
}

const childTable = new Map<string, ChildRow>();
const sessionTable = new Map<string, SessionRow>();
const eventTable = new Map<string, EventRow>();
const memoryTable = new Map<string, Map<string, MemoryRow>>();
const convoTable = new Map<string, ConvoRow[]>();

const noopPromise = Promise.resolve();

export async function openDatabaseAsync(): Promise<null> {
  return null;
}

export async function initDb(): Promise<void> {
  // no-op for web stub
}

export async function whenDbReady(): Promise<void> {
  return noopPromise;
}

export async function exec(sqlRaw: string, params: any[] = []): Promise<void> {
  const sql = normalize(sqlRaw);

  if (sql.startsWith("INSERT OR REPLACE INTO CHILD")) {
    const [id, displayName, createdAt] = params as [string, string, number];
    childTable.set(id, { id, display_name: displayName, created_at: Number(createdAt) });
    return;
  }

  if (sql.startsWith("UPDATE CHILD SET DISPLAY_NAME")) {
    const [displayName, id] = params as [string, string];
    const row = childTable.get(id);
    if (row) row.display_name = displayName;
    return;
  }

  if (sql.startsWith("INSERT INTO SESSION")) {
    const [id, childId, routineId, startedAt] = params as [string, string, string, number];
    sessionTable.set(id, {
      id,
      child_id: childId,
      routine_id: routineId,
      started_at: Number(startedAt),
      ended_at: null,
      engagement: null,
      notes: null,
    });
    return;
  }

  if (sql.startsWith("UPDATE SESSION SET ENDED_AT")) {
    const [endedAt, engagement, id] = params as [number | null, number | null, string];
    const row = sessionTable.get(id);
    if (row) {
      row.ended_at = endedAt == null ? null : Number(endedAt);
      row.engagement = engagement == null ? null : Number(engagement);
    }
    return;
  }

  if (sql.includes("INTO MEMORY")) {
    const [childId, key, value, score, updatedAt] = params as [string, string, string, number, number];
    let childMem = memoryTable.get(childId);
    if (!childMem) {
      childMem = new Map();
      memoryTable.set(childId, childMem);
    }
    const existing = childMem.get(key);
    if (existing) {
      existing.value = value;
      existing.score = existing.score + Number(score);
      existing.updated_at = Number(updatedAt);
    } else {
      childMem.set(key, {
        child_id: childId,
        key,
        value,
        score: Number(score),
        updated_at: Number(updatedAt),
      });
    }
    return;
  }

  if (sql.startsWith("INSERT INTO CONVO")) {
    const [childId, id, ts, role, text] = params as [string, string, number, string, string];
    const list = convoTable.get(childId) ?? [];
    list.push({ child_id: childId, id, ts: Number(ts), role, text });
    convoTable.set(childId, list);
    return;
  }

  if (sql.startsWith("INSERT INTO EVENT")) {
    const [id, sessionId, routineId, ts, stepId, type, valueJson] = params as [
      string,
      string,
      string,
      number,
      string | null,
      string,
      string | null,
    ];
    eventTable.set(id, {
      id,
      session_id: sessionId,
      routine_id: routineId,
      ts: Number(ts),
      step_id: stepId ?? null,
      type,
      value_json: valueJson ?? null,
    });
    return;
  }

  if (sql.startsWith("DELETE FROM EVENT")) {
    eventTable.clear();
    return;
  }

  if (sql.startsWith("DELETE FROM CONVO")) {
    convoTable.clear();
    return;
  }

  if (sql.startsWith("DELETE FROM MEMORY")) {
    memoryTable.clear();
    return;
  }

  if (sql.startsWith("DELETE FROM SESSION")) {
    sessionTable.clear();
    return;
  }

  if (sql.startsWith("DELETE FROM CHILD")) {
    childTable.clear();
    return;
  }

  console.warn("[db.web] Unhandled exec SQL", sqlRaw);
}

export async function query<T extends Row = Row>(sqlRaw: string, params: any[] = []): Promise<T[]> {
  const sql = normalize(sqlRaw);

  if (sql.startsWith("SELECT ID, DISPLAY_NAME, CREATED_AT FROM CHILD ORDER BY CREATED_AT DESC LIMIT 1")) {
    const rows = Array.from(childTable.values()).sort((a, b) => b.created_at - a.created_at);
    return (rows.slice(0, 1) as unknown) as T[];
  }

  if (sql.startsWith("SELECT ID, DISPLAY_NAME, CREATED_AT FROM CHILD WHERE ID")) {
    const [id] = params as [string];
    const row = childTable.get(id);
    return row ? ([row] as unknown as T[]) : [];
  }

  if (sql.startsWith("SELECT ID, SESSION_ID, ROUTINE_ID, TS, STEP_ID, TYPE, VALUE_JSON FROM EVENT ORDER BY TS ASC")) {
    const rows = Array.from(eventTable.values()).sort((a, b) => a.ts - b.ts);
    return (rows as unknown) as T[];
  }

  if (sql.startsWith("SELECT KEY, VALUE, SCORE, UPDATED_AT FROM MEMORY WHERE CHILD_ID")) {
    const [childId, limitRaw] = params as [string, number];
    const childMem = Array.from(memoryTable.get(childId)?.values() ?? []);
    childMem.sort((a, b) => {
      if (b.score === a.score) return b.updated_at - a.updated_at;
      return b.score - a.score;
    });
    const limit = typeof limitRaw === "number" ? limitRaw : Number(limitRaw ?? childMem.length);
    return (childMem.slice(0, limit) as unknown) as T[];
  }

  if (sql.startsWith("SELECT ID, TS, ROLE, TEXT FROM CONVO WHERE CHILD_ID")) {
    const [childId, limitRaw] = params as [string, number];
    const list = Array.from(convoTable.get(childId) ?? []);
    list.sort((a, b) => b.ts - a.ts);
    const limit = typeof limitRaw === "number" ? limitRaw : Number(limitRaw ?? list.length);
    return (list.slice(0, limit) as unknown) as T[];
  }

  console.warn("[db.web] Unhandled query SQL", sqlRaw);
  return [];
}

export async function closeDb(): Promise<void> {
  // Reset in-memory tables
  childTable.clear();
  sessionTable.clear();
  eventTable.clear();
  memoryTable.clear();
  convoTable.clear();
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toUpperCase();
}

export default {
  openDatabaseAsync,
  initDb,
  whenDbReady,
  exec,
  query,
  closeDb,
};

export * from "./models";
