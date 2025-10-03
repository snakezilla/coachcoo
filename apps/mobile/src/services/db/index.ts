import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function openDatabaseAsync(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("coachcoo.db");
  return db;
}

export async function initDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const database = await openDatabaseAsync();
    await database.execAsync?.("PRAGMA foreign_keys = ON;");
    await database.execAsync?.(`
      CREATE TABLE IF NOT EXISTS child(
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at INT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session(
        id TEXT PRIMARY KEY,
        child_id TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        started_at INT NOT NULL,
        ended_at INT,
        engagement REAL,
        notes TEXT,
        FOREIGN KEY(child_id) REFERENCES child(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS event(
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        ts INT NOT NULL,
        step_id TEXT,
        type TEXT NOT NULL,
        value_json TEXT,
        FOREIGN KEY(session_id) REFERENCES session(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS memory(
        child_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        score REAL NOT NULL DEFAULT 1,
        updated_at INT NOT NULL,
        PRIMARY KEY(child_id, key),
        FOREIGN KEY(child_id) REFERENCES child(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS convo(
        child_id TEXT NOT NULL,
        id TEXT PRIMARY KEY,
        ts INT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY(child_id) REFERENCES child(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_event_session_ts ON event(session_id, ts);
      CREATE INDEX IF NOT EXISTS idx_memory_child_score ON memory(child_id, score DESC, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_convo_child_ts ON convo(child_id, ts DESC);
    `);
  })();
  return initPromise;
}

export function whenDbReady(): Promise<void> {
  return initPromise ?? Promise.resolve();
}

async function requireDb(): Promise<SQLite.SQLiteDatabase> {
  const database = db ?? (await openDatabaseAsync());
  if (!database) {
    throw new Error("SQLite database is not available");
  }
  return database;
}

export async function exec(sql: string, params: SQLite.SQLiteBindParams = []): Promise<void> {
  const database = await requireDb();
  await database.runAsync?.(sql, params);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: SQLite.SQLiteBindParams = []
): Promise<T[]> {
  const database = await requireDb();
  const rows = await database.getAllAsync?.(sql, params);
  return (rows ?? []) as T[];
}

export async function closeDb(): Promise<void> {
  if (!db) return;
  await db.closeAsync?.();
  db = null;
  initPromise = null;
}

export * from "./models";
