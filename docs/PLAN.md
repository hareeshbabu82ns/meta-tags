# Meta Tags — Project Plan

## Overview

**Meta Tags** is a desktop application built with Electron for managing metadata tags on music files (MP3, FLAC, OGG, WAV) and document files (PDF, EPUB). It provides a unified interface for browsing, editing, copying/pasting, and auto-generating tags across large file libraries.

## Tech Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Framework      | Electron 40 + Electron Forge 7.11 (Vite template) |
| Frontend       | React 18+, TypeScript, Tailwind CSS v4, shadcn/ui |
| State          | Zustand                                           |
| Database       | better-sqlite3 (WAL mode, per-library cache)      |
| Audio Tags     | music-metadata (read), node-id3 (write MP3)       |
| Document Tags  | pdf-parse (PDF), jszip (EPUB OPF parsing)         |
| Audio Playback | HTML5 `<audio>` via custom `media://` protocol    |
| Icons          | lucide-react                                      |

## Confirmed Design Decisions

1. **Tailwind CSS v4** — plugin-based (`@tailwindcss/vite`), no config file
2. **shadcn/ui** — manually created components (Radix UI primitives)
3. **SQLite** — single DB file in `app.getPath('userData')`, WAL mode
4. **Queue-then-apply** — tag changes are queued as pending, reviewed, then applied in batch
5. **Sidecar fallback** — for non-MP3 files, tags are written to `.meta.json` sidecar files
6. **Custom `media://` protocol** — for streaming local audio files securely
7. **macOS hidden title bar** — `titleBarStyle: "hiddenInset"` with draggable region
8. **Dark theme by default** — `.dark` class on `<body>`, full CSS variable theme

## Feature Roadmap

### Phase 1 — Core (✅ Complete)

- [x] Library management (add/remove/list folders)
- [x] Recursive file scanner with metadata extraction
- [x] SQLite database layer (schema + CRUD)
- [x] Tag reader for MP3, FLAC, OGG, WAV, PDF, EPUB
- [x] Tag writer (MP3 native, sidecar for others)
- [x] IPC bridge with full preload API
- [x] Sidebar with folder tree navigation
- [x] File list with multi-select and context menu
- [x] Tag inspector with common + custom fields
- [x] Pending changes panel (queue, review, apply/reject)
- [x] Audio player with seek and volume
- [x] Tag copy/paste between files
- [x] Scan progress bar
- [x] Undo last tag change

### Phase 2 — Rules & Automation

- [ ] Tag rules editor UI (create, edit, delete rules)
- [ ] Live regex preview on selected files
- [ ] Bulk rule application via pending changes queue
- [ ] Import/export rule sets

### Phase 3 — File Viewing

- [ ] PDF viewer (react-pdf integration)
- [ ] EPUB reader (epubjs integration)
- [ ] Cover art display for audio files

### Phase 4 — Polish

- [ ] Keyboard shortcuts (Cmd+C/V for tags, Cmd+Z undo, Cmd+A select all)
- [ ] Drag-and-drop files into library
- [ ] Column sorting and filtering in file list
- [ ] Settings page (theme, default tag fields, sidecar location)
- [ ] Auto-update via Electron Forge publisher
