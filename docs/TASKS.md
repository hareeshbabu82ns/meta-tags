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

### Phase 2 — Tag Rules UI

- [x] TagRulesEditor.tsx component with full feature set:
  - Rule list with create/edit/delete
  - Regex input with live syntax validation
  - Template builder with capture group helpers ($1, $2, etc.)
  - Source field selector (filename, folder, tag:\*, index, datetime)
  - Live preview using first selected file
  - Embedded regex help panel with 50+ patterns
- [x] Integrated into App.tsx as modal dialog
- [x] Floating rules button to open/close panel
- [x] "Apply Rule" button that queues changes to pending changes panel
- [x] Import/export rules as JSON files
- [x] Live preview on rule list showing source → target mapping

### Phase 3 — File Viewers

- [x] PDF viewer using `react-pdf` in a modal/panel
- [x] EPUB reader using `epubjs` in a modal/panel
- [x] Album art / cover display for audio files
- [x] Double-click to open document viewer

### Phase 4 — Polish & UX

- [x] Keyboard shortcuts
  - `Cmd+C` / `Cmd+V` for tag copy/paste
  - `Cmd+Z` for undo
  - `Cmd+A` for select all
  - `Cmd+S` for queue changes
  - `Cmd+Shift+A` to apply all pending
  - `Escape` to clear selection
- [x] Column sorting in FileList (by name, type, size, date)
- [x] Column-based tag display in FileList (title, artist, album columns)
- [x] Drag-and-drop files/folders into library
- [x] Settings page
  - Theme toggle (dark/light/system)
  - File list view preference (list/table)
  - Keyboard shortcuts reference
- [x] Toast notifications for apply success/failure
- [x] Empty state illustrations
- [x] Loading skeletons

### Phase 5 — Distribution

- [x] App icon and branding
  - SVG source icon in `assets/icons/icon.svg`
  - macOS `.icns` generated via `npm run generate-icons`
  - Multi-resolution PNGs (16–1024px)
  - `forge.config.ts` configured with icon, appBundleId, appCategoryType
  - `package.json` updated with proper productName and description
- [x] DMG maker for macOS
  - `@electron-forge/maker-dmg` configured with background image
  - Drag-to-Applications layout with window sizing
  - Also configured `.deb` and `.rpm` makers for Linux
- [x] Auto-update configuration
  - `electron-updater` integrated via `src/main/services/auto-updater.ts`
  - IPC channels for update status, check, download, install
  - Preload bridge with `onUpdateStatus` event listener
  - Auto-checks for updates 5s after launch (production only)
- [x] Performance optimization (virtual scrolling for large libraries)
  - `@tanstack/react-virtual` integrated into FileList
  - Both list and table views use virtualized rendering
  - 20-item overscan for smooth scrolling
  - Handles 10,000+ files without performance degradation
- [x] Integration tests for IPC handlers
  - Vitest configured with `vitest.config.ts`
  - 44 tests across 3 test suites (unit + integration)
  - In-memory SQLite for isolated DB query tests
  - Rule engine integration tests with regex matching
  - Shared types utility tests
  - Auto rebuild of `better-sqlite3` for system Node / Electron
- [x] E2E tests with Playwright
  - Playwright configured for Electron via `playwright.config.ts`
  - App launch, sidebar rendering, settings dialog, keyboard shortcut tests
  - Test helper for launching/closing the Electron app

---

---

## 🔲 Remaining Tasks
