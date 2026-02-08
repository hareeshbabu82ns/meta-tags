import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Library,
  FileRecord,
  Tag,
  FolderNode,
  ScanProgress,
} from "../../shared/types";

interface LibraryState {
  libraries: Library[];
  activeLibraryId: number | null;
  folderTree: FolderNode[];
  activeFolderPath: string | null;
  loading: boolean;
  loadLibraries: () => Promise<void>;
  addLibrary: () => Promise<void>;
  removeLibrary: (id: number) => Promise<void>;
  setActiveLibrary: (id: number) => Promise<void>;
  setActiveFolder: (path: string | null) => void;
  refreshFolderTree: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  libraries: [],
  activeLibraryId: null,
  folderTree: [],
  activeFolderPath: null,
  loading: false,

  loadLibraries: async () => {
    const libraries = await window.electronAPI.getLibraries();
    set({ libraries });
    if (libraries.length > 0 && !get().activeLibraryId) {
      await get().setActiveLibrary(libraries[0].id);
    }
  },

  addLibrary: async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) return;
    const name = folderPath.split("/").pop() || folderPath;
    const lib = await window.electronAPI.addLibrary(folderPath, name);
    set((s) => ({ libraries: [...s.libraries, lib] }));
    await get().setActiveLibrary(lib.id);
    // Auto-scan after adding
    await window.electronAPI.scanLibrary(lib.id);
  },

  removeLibrary: async (id) => {
    await window.electronAPI.removeLibrary(id);
    set((s) => ({
      libraries: s.libraries.filter((l) => l.id !== id),
      activeLibraryId: s.activeLibraryId === id ? null : s.activeLibraryId,
    }));
  },

  setActiveLibrary: async (id) => {
    set({ activeLibraryId: id, activeFolderPath: null });
    await get().refreshFolderTree();
  },

  setActiveFolder: (path) => {
    set({ activeFolderPath: path });
  },

  refreshFolderTree: async () => {
    const id = get().activeLibraryId;
    if (!id) return;
    const tree = await window.electronAPI.getFolderTree(id);
    set({ folderTree: tree });
  },
}));

// ─── File Store ────────────────────────────────────────────────────────

export type SortField = "filename" | "type" | "size" | "modified_at";
export type SortDirection = "asc" | "desc";

interface FileState {
  files: FileRecord[];
  selectedFileIds: Set<number>;
  loading: boolean;
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  fileTags: Record<number, Record<string, string>>; // file_id -> {key: value}
  loadFiles: () => Promise<void>;
  loadFilesByFolder: (folderPath: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  selectFile: (id: number, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (id: number) => void;
  setSort: (field: SortField) => void;
  loadFileTags: (fileIds: number[]) => Promise<void>;
}

function sortFiles(
  files: FileRecord[],
  field: SortField,
  direction: SortDirection,
): FileRecord[] {
  return [...files].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "filename":
        cmp = a.filename.localeCompare(b.filename);
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
      case "size":
        cmp = a.size - b.size;
        break;
      case "modified_at":
        cmp = a.modified_at.localeCompare(b.modified_at);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  selectedFileIds: new Set(),
  loading: false,
  searchQuery: "",
  sortField: "filename",
  sortDirection: "asc",
  fileTags: {},

  loadFiles: async () => {
    const libId = useLibraryStore.getState().activeLibraryId;
    if (!libId) return;
    set({ loading: true });
    const files = await window.electronAPI.getFiles(libId);
    const { sortField, sortDirection } = get();
    const sorted = sortFiles(files, sortField, sortDirection);
    set({ files: sorted, loading: false, selectedFileIds: new Set() });
    // Load tags for file list columns
    get().loadFileTags(sorted.map((f) => f.id));
  },

  loadFilesByFolder: async (folderPath: string) => {
    set({ loading: true });
    const files = await window.electronAPI.getFilesByFolder(folderPath);
    const { sortField, sortDirection } = get();
    const sorted = sortFiles(files, sortField, sortDirection);
    set({ files: sorted, loading: false, selectedFileIds: new Set() });
    get().loadFileTags(sorted.map((f) => f.id));
  },

  search: async (query: string) => {
    set({ searchQuery: query, loading: true });
    if (!query.trim()) {
      await get().loadFiles();
      return;
    }
    const files = await window.electronAPI.searchFiles(query);
    set({ files, loading: false });
  },

  clearSearch: () => {
    set({ searchQuery: "" });
    get().loadFiles();
  },

  selectFile: (id, multi = false) => {
    set((s) => {
      const next = new Set(multi ? s.selectedFileIds : []);
      next.add(id);
      return { selectedFileIds: next };
    });
  },

  selectAll: () => {
    set((s) => ({ selectedFileIds: new Set(s.files.map((f) => f.id)) }));
  },

  clearSelection: () => {
    set({ selectedFileIds: new Set() });
  },

  toggleSelection: (id) => {
    set((s) => {
      const next = new Set(s.selectedFileIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedFileIds: next };
    });
  },

  setSort: (field) => {
    set((s) => {
      const direction =
        s.sortField === field && s.sortDirection === "asc" ? "desc" : "asc";
      const sorted = sortFiles(s.files, field, direction);
      return { sortField: field, sortDirection: direction, files: sorted };
    });
  },

  loadFileTags: async (fileIds) => {
    if (fileIds.length === 0) return;
    try {
      const allTags = await window.electronAPI.getMultipleFileTags(fileIds);
      const tagMap: Record<number, Record<string, string>> = {};
      for (const [idStr, tags] of Object.entries(allTags)) {
        const id = Number(idStr);
        tagMap[id] = {};
        for (const t of tags) {
          tagMap[id][t.key] = t.value;
        }
      }
      set((s) => ({ fileTags: { ...s.fileTags, ...tagMap } }));
    } catch {
      // silently fail — tags are just supplemental info
    }
  },
}));

// ─── Tag Clipboard Store ───────────────────────────────────────────────

interface ClipboardState {
  copiedTags: Record<string, string>;
  copyTags: (tags: Tag[]) => void;
  clearClipboard: () => void;
  hasCopiedTags: boolean;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  copiedTags: {},
  hasCopiedTags: false,

  copyTags: (tags) => {
    const map: Record<string, string> = {};
    for (const t of tags) {
      map[t.key] = t.value;
    }
    set({ copiedTags: map, hasCopiedTags: true });
  },

  clearClipboard: () => {
    set({ copiedTags: {}, hasCopiedTags: false });
  },
}));

// ─── Scan Progress Store ───────────────────────────────────────────────

interface ScanState {
  scanning: boolean;
  progress: ScanProgress | null;
}

export const useScanStore = create<ScanState>(() => ({
  scanning: false,
  progress: null,
}));

// ─── Pending Changes Store ─────────────────────────────────────────────

interface PendingChangesState {
  showPanel: boolean;
  togglePanel: () => void;
}

export const usePendingChangesStore = create<PendingChangesState>((set) => ({
  showPanel: false,
  togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
}));

// ─── Audio Player Store ────────────────────────────────────────────────

interface PlayerState {
  currentFile: FileRecord | null;
  playing: boolean;
  play: (file: FileRecord) => void;
  stop: () => void;
  setPlaying: (playing: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentFile: null,
  playing: false,
  play: (file) => set({ currentFile: file, playing: true }),
  stop: () => set({ currentFile: null, playing: false }),
  setPlaying: (playing) => set({ playing }),
}));

// ─── Document Viewer Store ─────────────────────────────────────────────

interface ViewerState {
  viewerFile: FileRecord | null;
  openViewer: (file: FileRecord) => void;
  closeViewer: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  viewerFile: null,
  openViewer: (file) => set({ viewerFile: file }),
  closeViewer: () => set({ viewerFile: null }),
}));

// ─── Settings Store ────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";

interface SettingsState {
  theme: ThemeMode;
  fileListView: "list" | "table";
  setTheme: (theme: ThemeMode) => void;
  setFileListView: (view: "list" | "table") => void;
  applyTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark" as ThemeMode,
      fileListView: "table" as "list" | "table",

      setTheme: (theme) => {
        set({ theme });
        // Apply immediately
        applyThemeToDOM(theme);
      },

      setFileListView: (view) => set({ fileListView: view }),

      applyTheme: () => {
        applyThemeToDOM(get().theme);
      },
    }),
    {
      name: "meta-tags-settings",
    },
  ),
);

function applyThemeToDOM(theme: ThemeMode) {
  const root = document.body;
  if (theme === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}
