import { getDb } from "./database";
import type {
  Library,
  FileRecord,
  Tag,
  TagRule,
  TagHistoryEntry,
  PendingChange,
  FolderNode,
} from "../../shared/types";
import { v4 as uuidv4 } from "uuid";

// ─── Libraries ─────────────────────────────────────────────────────────

export function getLibraries(): Library[] {
  return getDb()
    .prepare("SELECT * FROM libraries ORDER BY name")
    .all() as Library[];
}

export function addLibrary(libPath: string, name: string): Library {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO libraries (path, name) VALUES (?, ?)")
    .run(libPath, name);
  return db
    .prepare("SELECT * FROM libraries WHERE id = ?")
    .get(info.lastInsertRowid) as Library;
}

export function removeLibrary(id: number): void {
  getDb().prepare("DELETE FROM libraries WHERE id = ?").run(id);
}

// ─── Files ─────────────────────────────────────────────────────────────

export function upsertFile(
  libraryId: number,
  filePath: string,
  filename: string,
  type: string,
  size: number,
  modifiedAt: string,
): FileRecord {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO files (library_id, path, filename, type, size, modified_at, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(path) DO UPDATE SET
      filename = excluded.filename,
      type = excluded.type,
      size = excluded.size,
      modified_at = excluded.modified_at,
      scanned_at = datetime('now')
  `,
  ).run(libraryId, filePath, filename, type, size, modifiedAt);
  return db
    .prepare("SELECT * FROM files WHERE path = ?")
    .get(filePath) as FileRecord;
}

export function getFiles(libraryId: number): FileRecord[] {
  return getDb()
    .prepare("SELECT * FROM files WHERE library_id = ? ORDER BY filename")
    .all(libraryId) as FileRecord[];
}

export function getFilesByFolder(folderPath: string): FileRecord[] {
  return getDb()
    .prepare(
      "SELECT * FROM files WHERE path LIKE ? AND path NOT LIKE ? ORDER BY filename",
    )
    .all(folderPath + "/%", folderPath + "/%/%") as FileRecord[];
}

export function searchFiles(query: string): FileRecord[] {
  const like = `%${query}%`;
  return getDb()
    .prepare(
      `
    SELECT DISTINCT f.* FROM files f
    LEFT JOIN tags t ON t.file_id = f.id
    WHERE f.filename LIKE ? OR f.path LIKE ? OR t.value LIKE ?
    ORDER BY f.filename LIMIT 200
  `,
    )
    .all(like, like, like) as FileRecord[];
}

export function getFileById(id: number): FileRecord | undefined {
  return getDb().prepare("SELECT * FROM files WHERE id = ?").get(id) as
    | FileRecord
    | undefined;
}

export function getFileNeedingRescan(
  filePath: string,
  modifiedAt: string,
): boolean {
  const row = getDb()
    .prepare("SELECT modified_at FROM files WHERE path = ?")
    .get(filePath) as { modified_at: string } | undefined;
  return !row || row.modified_at !== modifiedAt;
}

// ─── Tags ──────────────────────────────────────────────────────────────

export function getFileTags(fileId: number): Tag[] {
  return getDb()
    .prepare("SELECT * FROM tags WHERE file_id = ? ORDER BY key")
    .all(fileId) as Tag[];
}

export function getMultipleFileTags(fileIds: number[]): Record<number, Tag[]> {
  const result: Record<number, Tag[]> = {};
  if (fileIds.length === 0) return result;

  const placeholders = fileIds.map(() => "?").join(",");
  const tags = getDb()
    .prepare(
      `SELECT * FROM tags WHERE file_id IN (${placeholders}) ORDER BY file_id, key`,
    )
    .all(...fileIds) as Tag[];

  for (const id of fileIds) {
    result[id] = [];
  }
  for (const tag of tags) {
    if (!result[tag.file_id]) result[tag.file_id] = [];
    result[tag.file_id].push(tag);
  }
  return result;
}

export function upsertTag(
  fileId: number,
  key: string,
  value: string,
  source: string = "native",
): void {
  getDb()
    .prepare(
      `
    INSERT INTO tags (file_id, key, value, source)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(file_id, key) DO UPDATE SET value = excluded.value, source = excluded.source
  `,
    )
    .run(fileId, key, value, source);
}

export function deleteFileTag(fileId: number, key: string): void {
  getDb()
    .prepare("DELETE FROM tags WHERE file_id = ? AND key = ?")
    .run(fileId, key);
}

export function clearFileTags(fileId: number): void {
  getDb().prepare("DELETE FROM tags WHERE file_id = ?").run(fileId);
}

// ─── Pending Changes ──────────────────────────────────────────────────

export function queueTagChange(
  fileId: number,
  filePath: string,
  filename: string,
  key: string,
  oldValue: string | null,
  newValue: string,
): PendingChange {
  const id = uuidv4();
  return {
    id,
    file_id: fileId,
    file_path: filePath,
    filename,
    key,
    old_value: oldValue,
    new_value: newValue,
    status: "pending",
  };
}

// ─── Tag History ──────────────────────────────────────────────────────

export function addTagHistory(
  fileId: number,
  key: string,
  oldValue: string | null,
  newValue: string | null,
  operation: "update" | "delete" | "create",
): void {
  getDb()
    .prepare(
      "INSERT INTO tag_history (file_id, key, old_value, new_value, operation) VALUES (?, ?, ?, ?, ?)",
    )
    .run(fileId, key, oldValue, newValue, operation);
}

export function getTagHistory(fileId: number): TagHistoryEntry[] {
  return getDb()
    .prepare(
      "SELECT * FROM tag_history WHERE file_id = ? ORDER BY timestamp DESC LIMIT 100",
    )
    .all(fileId) as TagHistoryEntry[];
}

export function getLastTagChange(fileId: number): TagHistoryEntry | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM tag_history WHERE file_id = ? ORDER BY timestamp DESC LIMIT 1",
    )
    .get(fileId) as TagHistoryEntry | undefined;
}

// ─── Tag Rules ────────────────────────────────────────────────────────

export function getTagRules(): TagRule[] {
  return getDb()
    .prepare("SELECT * FROM tag_rules ORDER BY is_preset DESC, name")
    .all() as TagRule[];
}

export function createTagRule(
  rule: Omit<TagRule, "id" | "created_at">,
): TagRule {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO tag_rules (name, source_field, regex, target_field, template, is_preset) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      rule.name,
      rule.source_field,
      rule.regex,
      rule.target_field,
      rule.template,
      rule.is_preset ? 1 : 0,
    );
  return db
    .prepare("SELECT * FROM tag_rules WHERE id = ?")
    .get(info.lastInsertRowid) as TagRule;
}

export function updateTagRule(rule: TagRule): void {
  getDb()
    .prepare(
      "UPDATE tag_rules SET name=?, source_field=?, regex=?, target_field=?, template=?, is_preset=? WHERE id=?",
    )
    .run(
      rule.name,
      rule.source_field,
      rule.regex,
      rule.target_field,
      rule.template,
      rule.is_preset ? 1 : 0,
      rule.id,
    );
}

export function deleteTagRule(id: number): void {
  getDb().prepare("DELETE FROM tag_rules WHERE id = ?").run(id);
}

// ─── Folder Tree ──────────────────────────────────────────────────────

export function getFolderTree(libraryId: number): FolderNode[] {
  const files = getDb()
    .prepare("SELECT path FROM files WHERE library_id = ?")
    .all(libraryId) as { path: string }[];

  const lib = getDb()
    .prepare("SELECT path FROM libraries WHERE id = ?")
    .get(libraryId) as { path: string } | undefined;
  if (!lib) return [];

  const rootPath = lib.path;
  const folderMap = new Map<
    string,
    { children: Set<string>; fileCount: number }
  >();

  for (const file of files) {
    const dir = file.path.substring(0, file.path.lastIndexOf("/"));
    const relative = dir.startsWith(rootPath) ? dir : dir;

    let current = relative;
    while (current.length >= rootPath.length) {
      if (!folderMap.has(current)) {
        folderMap.set(current, { children: new Set(), fileCount: 0 });
      }
      if (current === relative) {
        folderMap.get(current)!.fileCount++;
      }
      const parent = current.substring(0, current.lastIndexOf("/"));
      if (parent.length >= rootPath.length && parent !== current) {
        if (!folderMap.has(parent)) {
          folderMap.set(parent, { children: new Set(), fileCount: 0 });
        }
        folderMap.get(parent)!.children.add(current);
      }
      if (current === rootPath) break;
      current = parent;
    }
  }

  function buildNode(folderPath: string): FolderNode {
    const info = folderMap.get(folderPath) ?? {
      children: new Set(),
      fileCount: 0,
    };
    const name = folderPath.split("/").pop() || folderPath;
    const children = Array.from(info.children)
      .sort()
      .map((childPath) => buildNode(childPath));
    return { path: folderPath, name, children, fileCount: info.fileCount };
  }

  return [buildNode(rootPath)];
}
