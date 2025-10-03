import { exec, query } from "./index";
import { safeParse, safeStringify } from "../../lib/json";

export interface ChildRecord {
  id: string;
  display_name: string;
  created_at: number;
}

export interface SessionRecord {
  id: string;
  child_id: string;
  routine_id: string;
  started_at: number;
  ended_at?: number | null;
  engagement?: number | null;
  notes?: string | null;
}

export interface EventRecord {
  id: string;
  session_id: string;
  routine_id: string;
  ts: number;
  step_id?: string | null;
  type: string;
  value_json?: string | null;
}

export async function createChild(child: ChildRecord): Promise<void> {
  await exec(
    `INSERT OR REPLACE INTO child(id, display_name, created_at) VALUES(?,?,?)`,
    [child.id, child.display_name, child.created_at]
  );
}

export async function updateChildName(id: string, displayName: string): Promise<void> {
  await exec(`UPDATE child SET display_name=? WHERE id=?`, [displayName, id]);
}

export async function getLatestChild(): Promise<ChildRecord | undefined> {
  const rows = await query<ChildRecord>(
    `SELECT id, display_name, created_at FROM child ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0];
}

export async function getChildById(id: string): Promise<ChildRecord | undefined> {
  const rows = await query<ChildRecord>(
    `SELECT id, display_name, created_at FROM child WHERE id=? LIMIT 1`,
    [id]
  );
  return rows[0];
}

export async function createSession(session: SessionRecord): Promise<void> {
  await exec(
    `INSERT INTO session(id, child_id, routine_id, started_at, ended_at, engagement, notes)
     VALUES(?,?,?,?,NULL,NULL,NULL)`,
    [session.id, session.child_id, session.routine_id, session.started_at]
  );
}

export async function endSession(sessionId: string, endedAt: number, engagement: number): Promise<void> {
  await exec(`UPDATE session SET ended_at=?, engagement=? WHERE id=?`, [endedAt, engagement, sessionId]);
}

export interface LogEventPayload {
  id: string;
  sessionId: string;
  routineId: string;
  stepId: string;
  ts: number;
  type: string;
  value: Record<string, unknown>;
}

export async function logEvent(event: LogEventPayload): Promise<void> {
  await exec(
    `INSERT INTO event(id, session_id, routine_id, ts, step_id, type, value_json)
     VALUES(?,?,?,?,?,?,?)`,
    [
      event.id,
      event.sessionId,
      event.routineId,
      event.ts,
      event.stepId,
      event.type,
      safeStringify(event.value),
    ]
  );
}

export async function purgeAll(): Promise<void> {
  await exec(`DELETE FROM event`);
  await exec(`DELETE FROM convo`);
  await exec(`DELETE FROM memory`);
  await exec(`DELETE FROM session`);
  await exec(`DELETE FROM child`);
}

export async function listEvents(): Promise<EventRecord[]> {
  return query<EventRecord>(
    `SELECT id, session_id, routine_id, ts, step_id, type, value_json FROM event ORDER BY ts ASC`
  );
}

export interface RunnerLogEvent {
  id: string;
  sessionId: string;
  routineId: string;
  stepId: string;
  ts: number;
  type: string;
  value: Record<string, unknown>;
}

export interface RunnerLogger {
  logEvent(event: RunnerLogEvent): Promise<void>;
}

export const dbRunnerLogger: RunnerLogger = {
  logEvent: logEvent,
};

export function deserializeEventValue<T = unknown>(event: EventRecord): T | null {
  return safeParse<T>(event.value_json ?? null);
}
