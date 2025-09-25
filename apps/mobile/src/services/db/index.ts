import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase;

export function initDb() {
  db = SQLite.openDatabase("buddy.db");
  db.transaction((tx) => {
    tx.executeSql(`CREATE TABLE IF NOT EXISTS child(
      id TEXT PRIMARY KEY, display_name TEXT, created_at INT
    );`);
    tx.executeSql(`CREATE TABLE IF NOT EXISTS session(
      id TEXT PRIMARY KEY, child_id TEXT, routine_id TEXT,
      started_at INT, ended_at INT, engagement REAL, notes TEXT
    );`);
    tx.executeSql(`CREATE TABLE IF NOT EXISTS event(
      id TEXT PRIMARY KEY, session_id TEXT, ts INT, step_id TEXT,
      type TEXT, value_json TEXT
    );`);
  });
}

export function exec(sql: string, args: any[] = []): Promise<void> {
  return new Promise((res, rej) => {
    db.transaction((tx) => tx.executeSql(sql, args, () => res(), (_, e) => { rej(e); return false; }));
  });
}

export function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  return new Promise((res, rej) => {
    db.readTransaction((tx) =>
      tx.executeSql(sql, args, (_, { rows }) => res(rows._array as T[]), (_, e) => { rej(e); return false; })
    );
  });
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
  // Keep children to avoid retyping names, or clear if desired:
  // await exec(`DELETE FROM child;`);
}

export async function getLatestChild(): Promise<{ id: string; display_name: string } | undefined> {
  const rows = await query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM child ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0];
}
