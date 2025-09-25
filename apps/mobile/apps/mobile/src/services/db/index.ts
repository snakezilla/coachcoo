import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb() {
  if (db) return;
  db = await SQLite.openDatabaseAsync("buddy.db");
  // optional: better concurrency
  try { await db.execAsync?.("PRAGMA journal_mode = WAL;"); } catch {}
  await db.execAsync?.(`
    CREATE TABLE IF NOT EXISTS child(
      id TEXT PRIMARY KEY, display_name TEXT, created_at INT
    );
    CREATE TABLE IF NOT EXISTS session(
      id TEXT PRIMARY KEY, child_id TEXT, routine_id TEXT,
      started_at INT, ended_at INT, engagement REAL, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS event(
      id TEXT PRIMARY KEY, session_id TEXT, ts INT, step_id TEXT,
      type TEXT, value_json TEXT
    );
  `);
}

function requireDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return db!;
}

export async function exec(sql: string, args: any[] = []): Promise<void> {
  const d = requireDb();
  await d.runAsync(sql, args);
}

export async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const d = requireDb();
  const rows = await d.getAllAsync(sql, args);
  return rows as T[];
}

export async function logEvent(e: {
  id: string; session_id: string; ts: number; step_id: string; type: string; value: any;
}) {
  await exec(
    `INSERT INTO event(id,session_id,ts,step_id,type,value_json) VALUES (?,?,?,?,?,?)`,
    [e.id, e.session_id, e.ts, e.step_id, e.type, JSON.stringify(e.value ?? {})]
  );
}

export async function createSession(s: {
  id: string; child_id: string; routine_id: string; started_at: number;
}) {
  await exec(
    `INSERT INTO session(id, child_id, routine_id, started_at, ended_at, engagement, notes)
     VALUES(?,?,?,?,NULL,NULL,NULL)`,
    [s.id, s.child_id, s.routine_id, s.started_at]
  );
}

export async function endSession(id: string, ended_at: number, engagement: number) {
  await exec(`UPDATE session SET ended_at=?, engagement=? WHERE id=?`, [ended_at, engagement, id]);
}

export async function purgeAll() {
  await exec(`DELETE FROM event;`);
  await exec(`DELETE FROM session;`);
  // keep child table by default
}