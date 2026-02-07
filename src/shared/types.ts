// Shared types used across main and renderer processes

export type FileType = "mp3" | "flac" | "ogg" | "wav" | "pdf" | "epub";

export type FileCategory = "audio" | "document";

export function getFileCategory(type: FileType): FileCategory {
  return ["mp3", "flac", "ogg", "wav"].includes(type) ? "audio" : "document";
}

export function getFileType(filename: string): FileType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const map: Record<string, FileType> = {
    mp3: "mp3",
    flac: "flac",
    ogg: "ogg",
    wav: "wav",
    pdf: "pdf",
    epub: "epub",
  };
  return map[ext] ?? null;
}

export const SUPPORTED_EXTENSIONS = [
  ".mp3",
  ".flac",
  ".ogg",
  ".wav",
  ".pdf",
  ".epub",
];

// ─── Database Row Types ────────────────────────────────────────────────

export interface Library {
  id: number;
  path: string;
  name: string;
  created_at: string;
}

export interface FileRecord {
  id: number;
  library_id: number;
  path: string;
  filename: string;
  type: FileType;
  size: number;
  modified_at: string;
  scanned_at: string;
}

export interface Tag {
  id: number;
  file_id: number;
  key: string;
  value: string;
  source: "native" | "sidecar" | "rule";
}

export interface TagRule {
  id: number;
  name: string;
  source_field: string; // 'filename' | 'tag:<key>' | 'folder' | 'index' | 'datetime'
  regex: string;
  target_field: string;
  template: string; // e.g. "$1 - $2"
  is_preset: boolean;
  created_at: string;
}

export interface TagHistoryEntry {
  id: number;
  file_id: number;
  key: string;
  old_value: string | null;
  new_value: string | null;
  operation: "update" | "delete" | "create";
  timestamp: string;
}

export interface PendingChange {
  id: string; // uuid
  file_id: number;
  file_path: string;
  filename: string;
  key: string;
  old_value: string | null;
  new_value: string | null; // null means delete
  status: "pending" | "applied" | "rejected";
}

// ─── Common Tag Fields ─────────────────────────────────────────────────

export const COMMON_TAG_FIELDS = [
  "title",
  "artist",
  "album",
  "genre",
  "year",
  "track",
  "comment",
  "album_artist",
  "composer",
  "disc",
  "author",
  "subject",
  "publisher",
  "language",
  "description",
  "keywords",
] as const;

export type CommonTagField = (typeof COMMON_TAG_FIELDS)[number];

// File-type-specific common attributes for quick access
export const COMMON_ATTRIBUTES_BY_TYPE: Record<FileType, CommonTagField[]> = {
  mp3: [
    "title",
    "artist",
    "album",
    "album_artist",
    "genre",
    "year",
    "track",
    "disc",
    "composer",
    "comment",
  ],
  flac: [
    "title",
    "artist",
    "album",
    "album_artist",
    "genre",
    "year",
    "track",
    "disc",
    "composer",
    "comment",
  ],
  ogg: [
    "title",
    "artist",
    "album",
    "album_artist",
    "genre",
    "year",
    "track",
    "disc",
    "composer",
    "comment",
  ],
  wav: [
    "title",
    "artist",
    "album",
    "album_artist",
    "genre",
    "year",
    "track",
    "disc",
    "composer",
    "comment",
  ],
  pdf: [
    "title",
    "author",
    "subject",
    "keywords",
    "publisher",
    "description",
    "language",
    "year",
  ],
  epub: [
    "title",
    "author",
    "subject",
    "keywords",
    "publisher",
    "description",
    "language",
    "year",
  ],
};

// ─── IPC Channel Types ─────────────────────────────────────────────────

export interface ScanProgress {
  total: number;
  scanned: number;
  current: string;
}

export interface AlbumArtResult {
  data: string; // base64-encoded image data
  format: string; // MIME type e.g. 'image/jpeg'
}

// IPC API exposed to renderer via contextBridge
export interface ElectronAPI {
  // Libraries
  getLibraries(): Promise<Library[]>;
  addLibrary(path: string, name: string): Promise<Library>;
  removeLibrary(id: number): Promise<void>;
  selectFolder(): Promise<string | null>;

  // Scanning
  scanLibrary(libraryId: number): Promise<void>;
  onScanProgress(callback: (progress: ScanProgress) => void): () => void;
  onScanComplete(callback: (libraryId: number) => void): () => void;

  // Files
  getFiles(libraryId: number): Promise<FileRecord[]>;
  getFilesByFolder(folderPath: string): Promise<FileRecord[]>;
  searchFiles(query: string): Promise<FileRecord[]>;

  // Tags
  getFileTags(fileId: number): Promise<Tag[]>;
  getMultipleFileTags(fileIds: number[]): Promise<Record<number, Tag[]>>;

  // Pending Changes
  queueTagChange(
    change: Omit<PendingChange, "id" | "status">,
  ): Promise<PendingChange>;
  queueBulkTagChanges(
    changes: Omit<PendingChange, "id" | "status">[],
  ): Promise<PendingChange[]>;
  getPendingChanges(): Promise<PendingChange[]>;
  applyPendingChanges(
    ids: string[],
  ): Promise<{ success: string[]; failed: { id: string; error: string }[] }>;
  rejectPendingChanges(ids: string[]): Promise<void>;
  clearPendingChanges(): Promise<void>;

  // Tag History (Undo)
  getTagHistory(fileId: number): Promise<TagHistoryEntry[]>;
  undoLastChange(fileId: number): Promise<void>;

  // Tag Rules
  getTagRules(): Promise<TagRule[]>;
  createTagRule(rule: Omit<TagRule, "id" | "created_at">): Promise<TagRule>;
  updateTagRule(rule: TagRule): Promise<void>;
  deleteTagRule(id: number): Promise<void>;
  previewTagRule(ruleId: number, fileIds: number[]): Promise<PendingChange[]>;

  // File Streaming
  getStreamUrl(filePath: string): string;

  // File Viewers
  getAlbumArt(filePath: string): Promise<AlbumArtResult | null>;
  setAlbumArt(filePath: string, imagePath: string): Promise<boolean>;
  removeAlbumArt(filePath: string): Promise<boolean>;
  selectImageFile(): Promise<string | null>;
  readFileAsBase64(filePath: string): Promise<string>;

  // Folder tree
  getFolderTree(libraryId: number): Promise<FolderNode[]>;
}

export interface FolderNode {
  path: string;
  name: string;
  children: FolderNode[];
  fileCount: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
