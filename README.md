# Meta Tags

A desktop metadata tag editor for music and document files, built with Electron.

Browse, edit, copy/paste, and auto-generate tags across large libraries of MP3, FLAC, OGG, WAV, PDF, and EPUB files — all from a single app.

![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

### 📚 Library Management

- Add local folders as libraries and browse their full directory trees
- Recursive file scanner with incremental re-scan support
- Drag-and-drop files and folders into libraries
- Virtual scrolling handles 10,000+ files without performance issues

### 🏷️ Tag Editing

- Read and write metadata for **MP3, FLAC, OGG, WAV, PDF, and EPUB**
- Inspect and edit common fields (title, artist, album, genre, year, etc.) plus custom tags
- **Queue-then-apply workflow** — stage changes, review diffs, then batch-apply
- Undo last tag change with full history tracking
- Copy/paste tags between files via context menu or keyboard shortcuts

### 🤖 Auto-Tagging Rules

- Regex-based rule engine with capture group templates (`$1`, `$2`, etc.)
- Source fields: filename, folder name, track index, datetime, or any existing tag
- Live regex preview on selected files before applying
- Import/export rule sets as JSON

### 🎵 Audio Playback

- Built-in audio player with play/pause, seek bar, and volume control
- Custom `media://` protocol streams local files securely
- Play any supported audio file directly from the file list

### 📄 Document Viewing

- Integrated PDF viewer (react-pdf)
- EPUB reader (epubjs)
- Album art / cover display for audio files
- Double-click any document to open the viewer

### ⌨️ Keyboard Shortcuts

| Shortcut           | Action                |
| ------------------ | --------------------- |
| `Cmd/Ctrl + C`     | Copy tags             |
| `Cmd/Ctrl + V`     | Paste tags            |
| `Cmd/Ctrl + Z`     | Undo last change      |
| `Cmd/Ctrl + A`     | Select all files      |
| `Cmd/Ctrl + S`     | Queue current changes |
| `Cmd/Ctrl+Shift+A` | Apply all pending     |
| `Escape`           | Clear selection       |

### 🎨 UI & Polish

- Dark and light themes with system preference detection
- Column sorting in file list (name, type, size, date)
- Tag columns (title, artist, album) directly in the file list
- Loading skeletons and empty state illustrations
- Toast notifications for success/failure feedback
- Settings dialog with theme toggle, view preferences, and shortcut reference

---

## Tech Stack

| Layer          | Technology                                                |
| -------------- | --------------------------------------------------------- |
| Runtime        | Electron 40 + Electron Forge 7.11 (Vite plugin)           |
| Frontend       | React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui |
| State          | Zustand (6 stores with individual selectors)              |
| Database       | better-sqlite3 (WAL mode, single file in user data)       |
| Audio Tags     | music-metadata (read), node-id3 (write MP3)               |
| Document Tags  | pdf-parse (PDF), jszip (EPUB OPF parsing)                 |
| Audio Playback | HTML5 `<audio>` via custom `media://` protocol            |
| Testing        | Vitest (unit + integration), Playwright (E2E)             |
| Icons          | lucide-react                                              |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│                 Main Process                  │
│  SQLite DB  ·  File Scanner  ·  Tag Writer   │
│  Rule Engine  ·  IPC Handlers                │
│  media:// Protocol (audio streaming)         │
└──────────────────────┬───────────────────────┘
                       │ contextBridge (preload.ts)
┌──────────────────────┴───────────────────────┐
│              Renderer Process                 │
│  Zustand Stores  ·  React Components         │
│  Sidebar · FileList · TagInspector            │
│  AudioPlayer · PendingChangesPanel            │
│  TagRulesEditor · PDF/EPUB Viewers            │
└───────────────────────────────────────────────┘
```

Strict process separation is enforced — the renderer never touches Node.js APIs. All communication flows through typed IPC channels via `window.electronAPI`.

---

## Local Development

### Prerequisites

- **Node.js** 20+
- **npm** 9+
- **macOS**, **Linux**, or **Windows**

### Setup

```bash
git clone https://github.com/hareeshbabu82ns/meta-tags.git
cd meta-tags
npm install
```

> `better-sqlite3` is automatically rebuilt for Electron during `npm install` via `@electron/rebuild`.

### Commands

```bash
npm start              # Launch dev mode (Electron Forge + Vite HMR)
npm run lint           # ESLint across all .ts/.tsx files
npm test               # Run unit + integration tests (Vitest)
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run test:e2e       # Run end-to-end tests (Playwright)
npm run package        # Package the app (no installer)
npm run make           # Build distributable installers
```

### Project Structure

```
src/
├── main.ts                # Electron main process entry
├── preload.ts             # Context bridge (electronAPI)
├── renderer.ts            # React mount point
├── index.css              # Tailwind + shadcn/ui theme
├── shared/
│   ├── types.ts           # All TypeScript interfaces
│   └── ipc-channels.ts    # IPC channel constants
├── main/
│   ├── db/                # SQLite database + queries
│   ├── services/          # Scanner, tag writer, rule engine
│   └── ipc/               # IPC handler registrations
├── renderer/
│   ├── App.tsx            # Root layout
│   ├── stores/            # Zustand stores
│   ├── components/        # React components
│   └── hooks/             # Custom hooks
├── components/ui/         # shadcn/ui primitives
└── lib/utils.ts           # cn() helper
```

---

## Releasing

Releases are automated via GitHub Actions. When you push a version tag, the CI builds for all platforms and creates a draft GitHub Release with downloadable installers.

### 1. Bump the version

Update the version in `package.json`:

```bash
# Example: bump to 1.2.0
npm version 1.2.0 --no-git-tag-version
```

### 2. Commit and tag

```bash
git add package.json
git commit -m "release: v1.2.0"
git tag v1.2.0
git push origin main --tags
```

### 3. CI builds automatically

The [release workflow](.github/workflows/release.yml) triggers on any `v*` tag and:

1. **Builds** on 4 matrix targets in parallel:

   | Platform | Arch  | Outputs                |
   | -------- | ----- | ---------------------- |
   | macOS    | x64   | `.zip`, `.dmg`         |
   | macOS    | arm64 | `.zip`, `.dmg`         |
   | Linux    | x64   | `.zip`, `.deb`, `.rpm` |
   | Windows  | x64   | `.exe`, `.zip`         |

2. **Runs** lint and tests before building
3. **Creates** a draft GitHub Release with all artifacts attached
4. Tags containing `-` (e.g., `v1.2.0-beta.1`) are marked as prerelease

### 4. Publish the release

Go to [GitHub Releases](https://github.com/hareeshbabu82ns/meta-tags/releases), review the draft, edit release notes if needed, and click **Publish**.

---

## Building an App Like This with AI Agents

This entire project was built using AI coding agents (GitHub Copilot). Here is the prompt strategy and workflow that worked well for bootstrapping a full Electron desktop app from scratch.

### The Initial Prompt

> Build an Electron desktop app called "Meta Tags" for managing metadata tags on music files (MP3, FLAC, OGG, WAV) and document files (PDF, EPUB). Use Electron Forge with the Vite + TypeScript template, React 19 for the UI, Tailwind CSS v4, and shadcn/ui components. Use better-sqlite3 for local storage, music-metadata for reading audio tags, node-id3 for writing MP3 tags, and pdf-parse / jszip for document metadata. The app should have a sidebar with library folders, a file list with multi-select, a tag inspector panel, and an audio player. Tag changes should use a queue-then-apply workflow where edits are staged as pending changes, reviewed in a diff panel, then batch-applied. Use Zustand for state management with individual selector hooks. Enforce strict Electron process separation — renderer must never import Node.js modules. All IPC should go through a typed preload bridge.

### Phased Approach

Don't try to build everything at once. Break the project into phases and build each one fully before moving on:

1. **Phase 1 — Core scaffolding**: Project setup, database, file scanning, IPC bridge, basic UI (sidebar, file list, tag editor, pending changes panel, audio player)
2. **Phase 2 — Automation**: Tag rules engine with regex, rule editor UI, bulk application
3. **Phase 3 — Viewers**: PDF viewer, EPUB reader, album art display
4. **Phase 4 — Polish**: Keyboard shortcuts, drag-and-drop, sorting, settings, themes, toasts, loading states
5. **Phase 5 — Distribution**: App icons, platform-specific installers, auto-update, CI/CD, tests

### Tips for Working with AI Agents

- **Write a `.github/copilot-instructions.md`** early — it acts as persistent memory. Include architecture rules, conventions, file naming patterns, and anti-patterns. The agent reads it on every request.
- **Be specific about constraints** — "never import fs in renderer", "all SQL in queries.ts", "use individual Zustand selectors". Agents follow explicit rules well.
- **Keep a `docs/PLAN.md` and `docs/TASKS.md`** — use them as checklists. Ask the agent to update task status as it completes work.
- **One feature at a time** — ask for the full vertical slice (backend service → IPC handler → preload bridge → UI component → store integration).
- **Review and test incrementally** — run `npm start` after each feature. Fix issues immediately rather than batching them.
- **Ask for tests alongside features** — "add Vitest tests for the rule engine" right after implementing it.
- **Use the agent for boilerplate** — Electron IPC wiring, shadcn/ui components, database migrations, and CI workflows are perfect agent tasks.

---

## License

[MIT](LICENSE)
