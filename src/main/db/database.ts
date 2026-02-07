import Database from "better-sqlite3";
import path from "node:path";
import { app } from "electron";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "meta-tags.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
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
  `);

  // Seed default presets if none exist
  const presetCount = db
    .prepare("SELECT COUNT(*) as cnt FROM tag_rules WHERE is_preset = 1")
    .get() as { cnt: number };
  if (presetCount.cnt === 0) {
    const insert = db.prepare(
      "INSERT INTO tag_rules (name, source_field, regex, target_field, template, is_preset) VALUES (?, ?, ?, ?, ?, 1)",
    );
    insert.run(
      "Track number from filename",
      "filename",
      "^(\\d+)[\\s\\-_.]",
      "track",
      "$1",
    );
    insert.run(
      "Date from filename",
      "filename",
      "(\\d{4}-\\d{2}-\\d{2})",
      "year",
      "$1",
    );
    insert.run(
      "Artist - Title from filename",
      "filename",
      "^(.+?)\\s*-\\s*(.+?)\\.[^.]+$",
      "title",
      "$2",
    );
    insert.run(
      "Artist from filename (Artist - Title)",
      "filename",
      "^(.+?)\\s*-\\s*(.+?)\\.[^.]+$",
      "artist",
      "$1",
    );
    insert.run(
      "Album from parent folder",
      "folder",
      "([^/\\\\]+)[/\\\\]?$",
      "album",
      "$1",
    );
  }
}
