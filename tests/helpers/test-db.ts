/**
 * Test helper: provides an in-memory SQLite database with the same schema
 * as the production database. Used to test queries in isolation without
 * requiring Electron or the filesystem.
 */
import Database from "better-sqlite3";

/** Schema DDL extracted from src/main/db/database.ts */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    library_id INTEGER NOT NULL,
    path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    modified_at TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_files_library ON files(library_id);
  CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'native',
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, key)
  );

  CREATE INDEX IF NOT EXISTS idx_tags_file ON tags(file_id);
  CREATE INDEX IF NOT EXISTS idx_tags_key ON tags(key);

  CREATE TABLE IF NOT EXISTS tag_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_field TEXT NOT NULL,
    regex TEXT NOT NULL,
    target_field TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT '$1',
    is_preset INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tag_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    operation TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tag_history_file ON tag_history(file_id);

  CREATE TABLE IF NOT EXISTS tag_clipboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT ''
  );
`;

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/** Insert a library and return the id */
export function seedLibrary(
  db: Database.Database,
  libPath = "/test/music",
  name = "Test Library",
): number {
  const info = db
    .prepare("INSERT INTO libraries (path, name) VALUES (?, ?)")
    .run(libPath, name);
  return Number(info.lastInsertRowid);
}

/** Insert a file and return the id */
export function seedFile(
  db: Database.Database,
  libraryId: number,
  opts: {
    path?: string;
    filename?: string;
    type?: string;
    size?: number;
    modifiedAt?: string;
  } = {},
): number {
  const {
    path = "/test/music/song.mp3",
    filename = "song.mp3",
    type = "mp3",
    size = 5000000,
    modifiedAt = "2025-01-01 12:00:00",
  } = opts;

  const info = db
    .prepare(
      `INSERT INTO files (library_id, path, filename, type, size, modified_at, scanned_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(libraryId, path, filename, type, size, modifiedAt);
  return Number(info.lastInsertRowid);
}

/** Insert a tag */
export function seedTag(
  db: Database.Database,
  fileId: number,
  key: string,
  value: string,
  source = "native",
): void {
  db.prepare(
    "INSERT INTO tags (file_id, key, value, source) VALUES (?, ?, ?, ?)",
  ).run(fileId, key, value, source);
}
