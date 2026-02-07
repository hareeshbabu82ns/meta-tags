# Meta Tags — Architecture

## Process Model

```
┌──────────────────────────────────────────────┐
│                 Main Process                  │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │
│  │   DB    │  │ Scanner  │  │ Tag Writer   │  │
│  │ SQLite  │  │ (fs walk │  │ (node-id3 +  │  │
│  │ (WAL)   │  │ + parse) │  │  sidecar)    │  │
│  └────┬────┘  └────┬─────┘  └──────┬───────┘  │
│       │            │               │           │
│  ┌────┴────────────┴───────────────┴───────┐  │
│  │          IPC Handlers (ipcMain)         │  │
│  └─────────────────┬───────────────────────┘  │
│                    │                           │
│  ┌─────────────────┴───────────────────────┐  │
│  │     media:// Protocol (file stream)     │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────┘
                       │ contextBridge
┌──────────────────────┴───────────────────────┐
│              Renderer Process                 │
│                                               │
│  window.electronAPI  (preload.ts)             │
│                                               │
│  ┌───────────────────────────────────────┐    │
│  │           Zustand Stores              │    │
│  │  library | file | clipboard | scan    │    │
│  │  pendingChanges | player              │    │
│  └───────────────────┬───────────────────┘    │
│                      │                        │
│  ┌───────────────────┴───────────────────┐    │
│  │             React Components          │    │
│  │  App > Sidebar | FileList |           │    │
│  │        TagInspector | AudioPlayer |   │    │
│  │        PendingChangesPanel |          │    │
│  │        ScanProgressBar                │    │
│  └───────────────────────────────────────┘    │
└───────────────────────────────────────────────┘
```

## Directory Structure

```
meta-tags/
├── docs/                      # Project documentation
│   ├── PLAN.md
│   ├── TASKS.md
│   └── ARCHITECTURE.md
├── src/
│   ├── main.ts                # Electron main process entry
│   ├── preload.ts             # Context bridge (electronAPI)
│   ├── renderer.ts            # React mount point
│   ├── index.css              # Tailwind + shadcn/ui theme
│   ├── shared/
│   │   ├── types.ts           # All TypeScript types & interfaces
│   │   └── ipc-channels.ts    # IPC channel name constants
│   ├── main/
│   │   ├── db/
│   │   │   ├── database.ts    # SQLite init, migrations, WAL
│   │   │   └── queries.ts     # All CRUD operations
│   │   ├── services/
│   │   │   ├── scanner.ts     # Recursive file walker + metadata reader
│   │   │   ├── tag-writer.ts  # Write tags (MP3 native + sidecar)
│   │   │   └── rule-engine.ts # Regex-based auto-tagging engine
│   │   └── ipc/
│   │       └── handlers.ts    # All ipcMain.handle() registrations
│   ├── renderer/
│   │   ├── App.tsx            # Root layout component
│   │   ├── stores/
│   │   │   └── index.ts       # All Zustand stores
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── FileList.tsx
│   │       ├── TagInspector.tsx
│   │       ├── AudioPlayer.tsx
│   │       ├── PendingChangesPanel.tsx
│   │       └── ScanProgressBar.tsx
│   ├── components/ui/         # shadcn/ui primitives
│   └── lib/
│       └── utils.ts           # cn() utility
├── forge.config.ts            # Electron Forge configuration
├── vite.main.config.ts        # Vite config for main process
├── vite.renderer.config.ts    # Vite config for renderer (React+Tailwind)
├── vite.preload.config.ts     # Vite config for preload script
├── tsconfig.json
├── index.html                 # HTML shell with #app mount
└── package.json
```

## Data Flow

### Scanning

1. User clicks "Add Library" → `selectFolder` dialog → stores path in `libraries` table
2. `scanLibrary()` recursively walks the folder
3. For each supported file: extracts metadata, upserts into `files` + `tags` tables
4. Progress events sent via `webContents.send()` → renderer updates ScanProgressBar

### Tag Editing

1. User selects file(s) → TagInspector loads tags from DB
2. User edits fields → clicks "Queue Changes"
3. Changes stored in-memory `pendingChanges[]` array (main process)
4. PendingChangesPanel polls and displays the queue
5. User clicks "Apply" → `writeTagToFile()` writes to disk + updates DB
6. Tag history recorded for undo support

### Tag Copy/Paste

1. Right-click → "Copy Tags" → `getFileTags()` → stored in Zustand `clipboardStore`
2. Right-click target → "Paste Tags" → creates `PendingChange[]` for each key
3. Changes go through the same queue-then-apply flow

### Auto-Tagging Rules

1. Rules stored in `tag_rules` table with regex + template
2. `previewTagRule()` evaluates regex against selected files
3. Returns `PendingChange[]` preview without applying
4. User reviews and applies through the pending changes panel

## Database Schema

### Tables

- **libraries** — registered folder paths
- **files** — scanned file metadata (path, type, size, timestamps)
- **tags** — key-value tags per file (unique constraint on file_id + key)
- **tag_rules** — regex patterns for auto-tagging
- **tag_history** — change log for undo support
- **tag_clipboard** — persisted clipboard (optional)

### Indexes

- `idx_files_library` on `files(library_id)`
- `idx_files_path` on `files(path)` (unique)
- Unique constraint on `tags(file_id, key)`

## Security

- `contextIsolation: true` — renderer cannot access Node.js APIs
- `nodeIntegration: false` — all IPC through typed `electronAPI`
- Custom `media://` protocol registered with `stream: true` privilege
- No remote content loaded — all local files
