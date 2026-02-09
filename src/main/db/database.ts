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

  // Seed default presets (inserts any preset not already present by name)
  const presets: [string, string, string, string, string][] = [
    // ── Basic filename parsing ──────────────────────────────────────────
    [
      "Track number from filename",
      "filename",
      "^(\\d+)[\\s\\-_.]",
      "track",
      "$1",
    ],
    [
      "Track from filename (strip leading zeros)",
      "filename",
      "^0*(\\d+)\\s",
      "track",
      "$1",
    ],
    [
      "Date from filename (YYYY-MM-DD)",
      "filename",
      "(\\d{4}-\\d{2}-\\d{2})",
      "year",
      "$1",
    ],
    [
      "Title from filename (strip extension)",
      "filename",
      "^(.+)\\.[^.]+$",
      "title",
      "$1",
    ],

    // ── Artist - Title pattern ──────────────────────────────────────────
    [
      "Artist - Title from filename",
      "filename",
      "^(.+?)\\s*-\\s*(.+?)\\.[^.]+$",
      "title",
      "$2",
    ],
    [
      "Artist from filename (Artist - Title)",
      "filename",
      "^(.+?)\\s*-\\s*(.+?)\\.[^.]+$",
      "artist",
      "$1",
    ],

    // ── ## - Title pattern (e.g. "01 - My Song.mp3") ────────────────────
    [
      "Title from ## - Title filename",
      "filename",
      "^\\d{1,3}\\s*[-._]\\s*(.+?)\\.[^.]+$",
      "title",
      "$1",
    ],

    // ── ## - Artist - Title pattern (e.g. "01 - Pink Floyd - Time.mp3") ─
    [
      "Artist from ## - Artist - Title filename",
      "filename",
      "^\\d{1,3}\\s*[-._]\\s*(.+?)\\s+-\\s+.+?\\.[^.]+$",
      "artist",
      "$1",
    ],
    [
      "Title from ## - Artist - Title filename",
      "filename",
      "^\\d{1,3}\\s*[-._]\\s*.+?\\s+-\\s+(.+?)\\.[^.]+$",
      "title",
      "$1",
    ],

    // ── Year extraction ─────────────────────────────────────────────────
    [
      "Year from brackets in filename (19xx/20xx)",
      "filename",
      "[\\(\\[]((?:19|20)\\d{2})[\\)\\]]",
      "year",
      "$1",
    ],
    [
      "Year from brackets in folder name",
      "folder",
      "[\\(\\[]((?:19|20)\\d{2})[\\)\\]]",
      "year",
      "$1",
    ],
    [
      "Year from 4-digit number in folder",
      "folder",
      "((?:19|20)\\d{2})",
      "year",
      "$1",
    ],

    // ── Disc number (CD1, Disc 2, Disk3) ────────────────────────────────
    [
      "Disc number from filename",
      "filename",
      "(?:[Dd](?:isc|isk)|[Cc][Dd])\\s*(\\d+)",
      "disc",
      "$1",
    ],

    // ── Folder-based metadata ───────────────────────────────────────────
    [
      "Album from parent folder",
      "folder",
      "([^/\\\\]+)[/\\\\]?$",
      "album",
      "$1",
    ],
    [
      "Album from folder (strip bracketed year)",
      "folder",
      "[/\\\\]([^/\\\\]+?)\\s*[\\(\\[](?:19|20)\\d{2}[\\)\\]]\\s*$",
      "album",
      "$1",
    ],
    [
      "Album artist from grandparent folder",
      "folder",
      "([^/\\\\]+)[/\\\\][^/\\\\]+$",
      "album_artist",
      "$1",
    ],
    [
      "Genre from folder structure (Genre/Artist/Album)",
      "folder",
      "([^/\\\\]+)[/\\\\][^/\\\\]+[/\\\\][^/\\\\]+$",
      "genre",
      "$1",
    ],

    // ── Annotations & comments ──────────────────────────────────────────
    [
      "Comment from [bracketed] text in filename",
      "filename",
      "\\[([^\\]]+)\\]",
      "comment",
      "$1",
    ],

    // ── Document-specific (PDF, EPUB) ───────────────────────────────────
    [
      "Author from Author - Title document",
      "filename",
      "^(.+?)\\s*[-–—]\\s*.+?\\.[^.]+$",
      "author",
      "$1",
    ],
    [
      "Title from Author - Title document",
      "filename",
      "^.+?\\s*[-–—]\\s*(.+?)\\.[^.]+$",
      "title",
      "$1",
    ],
  ];

  const insertPreset = db.prepare(
    "INSERT INTO tag_rules (name, source_field, regex, target_field, template, is_preset) VALUES (?, ?, ?, ?, ?, 1)",
  );
  const presetExists = db.prepare(
    "SELECT COUNT(*) as cnt FROM tag_rules WHERE name = ? AND is_preset = 1",
  );

  for (const [name, source, regex, target, template] of presets) {
    const row = presetExists.get(name) as { cnt: number };
    if (row.cnt === 0) {
      insertPreset.run(name, source, regex, target, template);
    }
  }
}
