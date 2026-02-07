# Meta Tags — Task Tracker

## ✅ Completed

### Infrastructure

- [x] Scaffold Electron Forge project (Vite + TypeScript template)
- [x] Install all npm dependencies
- [x] Configure Vite (main, renderer, preload) with React + Tailwind plugins
- [x] Configure TypeScript with path aliases (`@/*`)
- [x] Rebuild better-sqlite3 native module for Electron
- [x] Create shadcn/ui theme CSS with dark mode variables
- [x] Create 15 shadcn/ui components (button, input, label, scroll-area, separator, badge, textarea, dialog, tabs, context-menu, dropdown-menu, select, checkbox, progress, tooltip)

### Backend (Main Process)

- [x] SQLite database initialization with WAL mode + schema migration
- [x] Full CRUD queries (libraries, files, tags, rules, history, folder tree)
- [x] Recursive folder scanner with incremental re-scan
- [x] Audio metadata reader (music-metadata for MP3/FLAC/OGG/WAV)
- [x] PDF metadata reader (pdf-parse)
- [x] EPUB metadata reader (jszip OPF extraction)
- [x] Tag writer — MP3 (node-id3) + sidecar (.meta.json) for others
- [x] Regex-based rule engine with preview capability
- [x] All IPC handlers registered
- [x] Custom `media://` protocol for audio streaming
- [x] In-memory pending changes queue with apply/reject/clear
- [x] Tag history recording + undo last change

### Frontend (Renderer)

- [x] React app mount with Zustand stores
- [x] Sidebar with library list, add/remove, folder tree navigation
- [x] FileList with search, multi-select, checkbox, context menu (copy/paste tags, play)
- [x] TagInspector with common fields, custom tags, add/remove, queue changes
- [x] AudioPlayer with play/pause, seek, volume, mute, close
- [x] PendingChangesPanel with collapsible diff view, select, apply/reject/clear
- [x] ScanProgressBar with percentage and current file display
- [x] Tag copy/paste via Zustand clipboard store

### Documentation

- [x] PLAN.md — project overview and feature roadmap
- [x] ARCHITECTURE.md — system design, data flow, directory structure
- [x] TASKS.md — this file

---

## 🔲 Remaining Tasks

### Phase 2 — Tag Rules UI

- [ ] Create `TagRulesEditor.tsx` component
  - Rule list with create/edit/delete
  - Regex input with live syntax validation
  - Template builder with capture group helpers ($1, $2, etc.)
  - Source field selector (filename, folder, tag:\*, index, datetime)
- [ ] Add "Rules" tab or panel in main layout
- [ ] Live preview: select files → pick rule → show proposed changes inline
- [ ] "Apply Rule" button that feeds results into pending changes queue
- [ ] Import/export rules as JSON

### Phase 3 — File Viewers

- [ ] PDF viewer using `react-pdf` in a modal/panel
- [ ] EPUB reader using `epubjs` in a modal/panel
- [ ] Album art / cover display for audio files
- [ ] Double-click to open document viewer

### Phase 4 — Polish & UX

- [ ] Keyboard shortcuts
  - `Cmd+C` / `Cmd+V` for tag copy/paste
  - `Cmd+Z` for undo
  - `Cmd+A` for select all
  - `Cmd+S` for queue changes
  - `Cmd+Shift+A` to apply all pending
- [ ] Column sorting in FileList (by name, type, size, date)
- [ ] Column-based tag display in FileList (title, artist, album columns)
- [ ] Drag-and-drop files/folders into library
- [ ] Settings page
  - Theme toggle (dark/light)
  - Default tag fields configuration
  - Sidecar file location preference
  - Database location preference
- [ ] Toast notifications for apply success/failure
- [ ] Empty state illustrations
- [ ] Loading skeletons

### Phase 5 — Distribution

- [ ] App icon and branding
- [ ] DMG maker for macOS
- [ ] Auto-update configuration
- [ ] Performance optimization (virtual scrolling for large libraries)
- [ ] Integration tests for IPC handlers
- [ ] E2E tests with Playwright
