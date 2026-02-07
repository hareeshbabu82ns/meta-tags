# Required Skills & Knowledge Areas — Meta Tags

This document outlines the skills and domain knowledge relevant for contributing to this project.

## Core Skills

### Electron

- Electron main/renderer/preload process model
- `contextBridge` and `contextIsolation` security model
- `ipcMain.handle()` / `ipcRenderer.invoke()` request-response pattern
- `ipcRenderer.on()` / `webContents.send()` for push events (scan progress)
- `protocol.registerSchemesAsPrivileged()` and `protocol.handle()` for custom protocols
- `dialog.showOpenDialog()` for native folder selection
- Electron Forge 7 with Vite plugin — build pipeline, config, packaging
- Native module rebuilding with `@electron/rebuild` (better-sqlite3)
- `app.getPath('userData')` for platform-specific data storage

### React & Frontend

- React 19 functional components with hooks
- Zustand state management — store creation, selectors, `setState` from outside components
- Radix UI primitives (dialog, dropdown-menu, context-menu, tabs, select, checkbox, progress, tooltip)
- shadcn/ui component authoring pattern (CVA variants, `cn()` utility, Radix wrappers)
- Tailwind CSS v4 — `@tailwindcss/vite` plugin, CSS custom properties theming, `@custom-variant`
- `class-variance-authority` for component variant definitions
- HTML5 `<audio>` API — `play()`, `pause()`, `currentTime`, `duration`, `volume`, event handlers

### TypeScript

- Strict mode TypeScript with explicit types
- `type` vs `interface` — interfaces for object shapes, types for unions/intersections
- Path aliases (`@/*`) with tsconfig `paths` + Vite `resolve.alias`
- Discriminated unions and type narrowing
- `as const` assertions for literal types

### SQLite / better-sqlite3

- Synchronous API: `.prepare()`, `.run()`, `.get()`, `.all()`
- WAL mode for concurrent read performance
- Schema migrations (CREATE TABLE IF NOT EXISTS)
- Parameterized queries to prevent SQL injection
- UPSERT pattern: `INSERT ... ON CONFLICT ... DO UPDATE`
- Foreign keys and unique constraints

### File Metadata & Parsing

- **music-metadata**: ESM-only library, must use dynamic `import()` in CJS context. Parses ID3, Vorbis, FLAC metadata. Returns `IAudioMetadata` with `common` and `format` fields.
- **node-id3**: Synchronous ID3v2 tag writer for MP3. `NodeID3.update(tags, filePath)`.
- **pdf-parse**: Extracts PDF `info` object (Title, Author, Subject, Keywords, Creator, Producer).
- **jszip**: Reads EPUB as ZIP, extracts `META-INF/container.xml` → locates OPF file → parses `<dc:*>` Dublin Core metadata.
- **Sidecar pattern**: `.meta.json` files alongside non-MP3 files for persistent custom metadata.

### Audio Streaming

- Custom Electron protocol (`media://`) registered with `stream: true` privilege
- `net.fetch()` + `pathToFileURL()` for serving local files through the protocol
- `<audio src="media://file/path/to/file.mp3">` in renderer

### Regex & Auto-Tagging

- JavaScript `RegExp` with capture groups
- Template substitution (`$1`, `$2`) for building tag values from regex matches
- Source fields: filename, folder name, file index, datetime, existing tag values

## Build & Tooling Skills

### Vite

- Multi-config setup (main, renderer, preload) via Electron Forge Vite plugin
- Dynamic import of ESM-only plugins in CJS config context
- `rollupOptions.external` for native Node modules
- `resolve.alias` for path aliases
- Hot Module Replacement in renderer during development

### Package Management

- npm workspaces awareness (single package)
- Native module handling: `@electron/rebuild` for recompiling C++ addons against Electron's Node headers
- Dependency classification: `dependencies` (bundled in app) vs `devDependencies` (build tools only)

### Electron Forge

- `forge.config.ts` structure — packagerConfig, makers, plugins
- `MakerZIP` for macOS, `MakerSquirrel` for Windows, `MakerDeb`/`MakerRpm` for Linux
- `auto-unpack-natives` plugin for handling native modules in ASAR
- `FusesPlugin` for Electron security fuses

## Domain Knowledge

### Metadata Standards

- **ID3v2** (MP3): Title, Artist, Album, Genre, Year, Track, Comment, Album Artist, Composer, Disc
- **Vorbis Comment** (FLAC, OGG): Similar fields in uppercase key-value pairs
- **Dublin Core** (EPUB): `dc:title`, `dc:creator`, `dc:subject`, `dc:description`, `dc:publisher`, `dc:language`
- **PDF Info Dictionary**: Title, Author, Subject, Keywords, Creator, Producer
- Common tag field superset defined in `COMMON_TAG_FIELDS` constant

### File Formats

| Format     | Ext   | Category | Read Library   | Write Method          |
| ---------- | ----- | -------- | -------------- | --------------------- |
| MP3        | .mp3  | audio    | music-metadata | node-id3 (native ID3) |
| FLAC       | .flac | audio    | music-metadata | sidecar .meta.json    |
| OGG Vorbis | .ogg  | audio    | music-metadata | sidecar .meta.json    |
| WAV        | .wav  | audio    | music-metadata | sidecar .meta.json    |
| PDF        | .pdf  | document | pdf-parse      | sidecar .meta.json    |
| EPUB       | .epub | document | jszip (OPF)    | sidecar .meta.json    |

### UX Patterns

- **Queue-then-apply**: All tag changes are staged, reviewed, then batch-applied — never written directly
- **Tag copy/paste**: Copy tags from one file, paste onto one or many — goes through the queue
- **Undo**: Tag history log allows reverting the last change per file
- **Incremental scan**: Re-scan only processes files with newer `modified_at` than `scanned_at`
- **Folder tree navigation**: Hierarchical browse within a library
