# Copilot Instructions — Meta Tags

## Project Overview

Meta Tags is an Electron desktop app for managing metadata tags on music (MP3, FLAC, OGG, WAV) and document (PDF, EPUB) files. It uses a queue-then-apply workflow: tag changes are staged as pending, reviewed in a diff panel, then applied in batch.

## Tech Stack

- **Runtime**: Electron 40 + Electron Forge 7.11 (Vite plugin)
- **Frontend**: React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui
- **State**: Zustand (individual selector hooks, no monolithic selectors)
- **Database**: better-sqlite3 with WAL mode, single file in `app.getPath('userData')`
- **Audio tags**: music-metadata (read, ESM — use dynamic `import()`), node-id3 (write MP3)
- **Document tags**: pdf-parse (PDF), jszip (EPUB OPF parsing)
- **Audio playback**: HTML5 `<audio>` via custom `media://` protocol
- **Icons**: lucide-react (tree-shakeable)
- **Utilities**: clsx + tailwind-merge via `cn()` helper at `@/lib/utils`

## Developer Workflow

```bash
npm start          # Launch dev mode (Electron Forge + Vite HMR)
npm run package    # Package the app (no installer)
npm run make       # Build distributable installers
npm run lint       # ESLint across .ts/.tsx files
```

No test framework is currently configured. Native module `better-sqlite3` is rebuilt automatically by `@electron/rebuild` during `npm install`.

## Architecture Rules

### Electron Process Separation (CRITICAL)

| Layer        | Directory        | Rules                                                                             |
| ------------ | ---------------- | --------------------------------------------------------------------------------- |
| **Main**     | `src/main/`      | Node.js APIs, SQLite, file system, IPC handlers. Never import React here.         |
| **Renderer** | `src/renderer/`  | React, Zustand, UI only. Never import `electron`, `fs`, `path`, `better-sqlite3`. |
| **Preload**  | `src/preload.ts` | Only bridge. Exposes typed `window.electronAPI` via `contextBridge`.              |
| **Shared**   | `src/shared/`    | Types + IPC channel constants only. No Node.js or browser runtime code.           |

The `ElectronAPI` interface and `declare global { Window }` live in `src/shared/types.ts`.

### IPC Communication — Two Patterns

**Request-response** (most channels): `ipcRenderer.invoke()` ↔ `ipcMain.handle()`.

**One-way events** (scan progress): Main pushes via `win.webContents.send()`. Preload wraps with `ipcRenderer.on()` and returns an unsubscribe function:

```ts
onScanProgress: (callback) => {
  const handler = (_event, progress) => callback(progress);
  ipcRenderer.on(IPC.SCAN_PROGRESS, handler);
  return () => ipcRenderer.removeListener(IPC.SCAN_PROGRESS, handler);
},
```

### Adding New IPC Channels — 6-step checklist

1. Channel constant → `src/shared/ipc-channels.ts`
2. Method signature → `ElectronAPI` interface in `src/shared/types.ts`
3. SQL queries → `src/main/db/queries.ts` (never inline SQL in handlers)
4. Handler → `ipcMain.handle()` in `src/main/ipc/handlers.ts`
5. Bridge → `ipcRenderer.invoke()` in `src/preload.ts`
6. Call from renderer via `window.electronAPI.methodName()`

## Zustand Stores

All 6 stores live in `src/renderer/stores/index.ts`, separated by `// ─── Name ───` comment headers:

`useLibraryStore` (libraries, folder tree), `useFileStore` (file list, selection as `Set<number>`), `useClipboardStore` (copied tags), `useScanStore` (scan progress), `usePendingChangesStore` (panel toggle), `usePlayerStore` (audio playback).

**Always use individual selectors** to prevent re-renders: `const libs = useLibraryStore((s) => s.libraries);`

**Cross-store access** (outside React): `useLibraryStore.getState().activeLibraryId` — never use hooks.

**External state updates**: Scan progress is set from `App.tsx` via `useScanStore.setState()` since it originates from IPC events.

### Vite Configuration

There are 3 separate Vite configs — main, renderer, preload — orchestrated by Electron Forge:

- `vite.renderer.config.ts` uses **async config** to dynamically import ESM-only plugins (`@vitejs/plugin-react`, `@tailwindcss/vite`). This is required because tsconfig uses `module: "commonjs"`.
- `vite.main.config.ts` externalizes `better-sqlite3` via rollupOptions (native module).
- Path alias `@/*` → `./src/*` is configured in both tsconfig and vite.renderer.config.

## Key Conventions

- **TypeScript**: `strict: true`, use `type` imports, prefix unused params with `_`, no `any`.
- **Components**: Named exports (`export function Sidebar() {}`), shadcn/ui in `src/components/ui/`.
- **Tailwind v4**: No config file. Semantic tokens from `src/index.css` (HSL). Dark mode via `.dark` class.
- **Database**: All SQL in `src/main/db/queries.ts`. Prepared statements. Schema migrations in `src/main/db/database.ts`. Tables: `libraries`, `files`, `tags`, `tag_rules`, `tag_history`, `tag_clipboard`.
- **Services**: Pure functions in `src/main/services/`. Receive `BrowserWindow` as param if needed — don't import `electron` directly.

### TypeScript

- `strict: true` — no implicit any, no unchecked index access
- Use `type` imports when importing only types: `import type { Foo } from "..."`
- All database row shapes are interfaces in `src/shared/types.ts`
- Prefix unused callback params with underscore: `(_event, arg) => {}`

### React Components

- Named exports for all components: `export function Sidebar() {}`
- Use individual Zustand selectors to prevent unnecessary re-renders:

  ```ts
  const libraries = useLibraryStore((s) => s.libraries);
  ```

- Icons come from `lucide-react` — import only what's needed
- Use `cn()` from `@/lib/utils` for conditional class merging
- shadcn/ui components live in `src/components/ui/` and use Radix primitives

### Tailwind CSS v4

- No `tailwind.config.js` — plugin-based via `@tailwindcss/vite`
- Theme uses CSS custom properties defined in `src/index.css` (HSL format)
- Use shadcn/ui semantic tokens: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `bg-destructive`, `bg-primary`, etc.
- Dark mode via `.dark` class on `<body>` + `@custom-variant dark (&:is(.dark *))`
- Prefer Tailwind v4 shorthand: `shrink-0` not `flex-shrink-0`, `grow` not `flex-grow`

### Database & Queries

- All SQL queries live in `src/main/db/queries.ts` — no inline SQL in IPC handlers
- Use prepared statements via better-sqlite3's `.prepare().run()` / `.get()` / `.all()`
- Schema migrations run in `src/main/db/database.ts` on app startup
- Tags use a key-value model with unique constraint on `(file_id, key)`

### Pending Changes & Tag Writing

All tag writes MUST go through the pending changes queue (in-memory array in `src/main/ipc/handlers.ts`):

1. Queue changes via `changes:queue` / `changes:queue-bulk`
2. Apply writes to file + record in `tag_history` for undo

**MP3**: Native ID3 via `node-id3` (key mapping in `src/main/services/tag-writer.ts`, e.g. `album_artist` → `performerInfo`).
**All others**: Sidecar `.meta.json` file alongside the original.

Tag rules (`src/main/services/rule-engine.ts`) use regex capture groups. `source_field` values: `filename`, `folder`, `index`, `datetime`, `tag:<key>`.

### Pending Changes Workflow

All tag modifications go through the pending changes queue:

1. Create `PendingChange` objects (with `uuid` IDs)
2. Store in-memory in `pendingChanges[]` array (main process)
3. Renderer polls/fetches the queue for display
4. Apply writes to file (node-id3 for MP3, `.meta.json` sidecar for others) + updates DB
5. Record in `tag_history` for undo support

### Tag Writing

- **MP3**: Native ID3 tags via `node-id3`
- **FLAC, OGG, WAV, PDF, EPUB**: Sidecar `.meta.json` file alongside the original
- Always record tag history before writing for undo capability

## Audio Playback

Custom `media://` protocol registered in `src/main.ts` streams local files. `getStreamUrl()` in preload returns `media://file<encodedPath>` — synchronous, not IPC.

## File Naming Conventions

- React components: PascalCase (`Sidebar.tsx`, `FileList.tsx`, `TagInspector.tsx`)
- shadcn/ui components: kebab-case (`button.tsx`, `scroll-area.tsx`, `context-menu.tsx`)
- Services/utilities: kebab-case (`tag-writer.ts`, `rule-engine.ts`, `ipc-channels.ts`)
- Stores: `index.ts` in `stores/` folder, multiple stores in one file separated by comment headers
- Types: all in `src/shared/types.ts`

## Import Order Convention

1. React / external libraries
2. lucide-react icons
3. shadcn/ui components (`@/components/ui/...`)
4. Local components / stores
5. Shared types (using `import type`)

## Common Patterns

### Creating a new shadcn/ui component

Place in `src/components/ui/`, use Radix primitives, re-export with `cn()` styling and `cva` variants. Follow the existing button/input pattern.

### Creating a new renderer component

Place in `src/renderer/components/`, use named export, consume Zustand stores via individual selectors, access main process via `window.electronAPI.*`.

### Creating a new main process service

Place in `src/main/services/`, export pure functions, import in `src/main/ipc/handlers.ts`. Services should not import `electron` directly — receive `BrowserWindow` or `webContents` as parameters if needed.

## Things to Avoid

- ❌ Do NOT use `require()` in renderer code — it's context-isolated
- ❌ Do NOT import `better-sqlite3`, `fs`, `path`, or any Node.js module in renderer
- ❌ Do NOT use static `import` for ESM-only packages in main process — use dynamic `import()`
- ❌ Do NOT inline SQL in IPC handlers — add queries to `queries.ts`
- ❌ Do NOT use `any` — prefer `unknown` + type guards or specific types
- ❌ Do NOT bypass the pending changes queue for tag writes — always queue first
- ❌ Do NOT use `nodeIntegration: true` — the app relies on context isolation

```

```
