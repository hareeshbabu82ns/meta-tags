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

## Architecture Rules

### Electron Process Separation (CRITICAL)

- **Main process** (`src/main/`): Node.js APIs, SQLite, file system, IPC handlers. Never import React or renderer code here.
- **Renderer process** (`src/renderer/`): React components, Zustand stores, UI only. Never import `electron`, `fs`, `path`, or `better-sqlite3` here.
- **Preload** (`src/preload.ts`): The only bridge. Exposes `window.electronAPI` via `contextBridge.exposeInMainWorld()`. All renderer↔main communication uses typed IPC through this API.
- **Shared** (`src/shared/`): Types and IPC channel constants only. No runtime code that depends on Node.js or browser APIs.

### Adding New IPC Channels

When adding new functionality that requires main↔renderer communication:

1. Add channel name constant to `src/shared/ipc-channels.ts`
2. Add the method signature to the `ElectronAPI` interface in `src/shared/types.ts`
3. Register the handler with `ipcMain.handle()` in `src/main/ipc/handlers.ts`
4. Expose the method in `src/preload.ts` using `ipcRenderer.invoke()`
5. Call it from the renderer via `window.electronAPI.methodName()`

### Vite Configuration

There are 3 separate Vite configs — main, renderer, preload — orchestrated by Electron Forge:

- `vite.renderer.config.ts` uses **async config** to dynamically import ESM-only plugins (`@vitejs/plugin-react`, `@tailwindcss/vite`). This is required because tsconfig uses `module: "commonjs"`.
- `vite.main.config.ts` externalizes `better-sqlite3` via rollupOptions (native module).
- Path alias `@/*` → `./src/*` is configured in both tsconfig and vite.renderer.config.

## Code Conventions

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
