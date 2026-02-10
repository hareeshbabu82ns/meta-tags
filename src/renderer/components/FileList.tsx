import React, { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Music,
  FileText,
  BookOpen,
  Search,
  X,
  Copy,
  ClipboardPaste,
  Tags,
  Play,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  List,
  Table2,
  FolderInput,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  useFileStore,
  useClipboardStore,
  usePlayerStore,
  useViewerStore,
  useSettingsStore,
  usePendingChangesStore,
} from "../stores";
import type { SortField } from "../stores";
import type { FileRecord } from "../../shared/types";
import { getFileCategory } from "../../shared/types";

const FILE_ICONS: Record<string, React.ReactNode> = {
  mp3: <Music className="h-4 w-4 text-blue-400" />,
  flac: <Music className="h-4 w-4 text-purple-400" />,
  ogg: <Music className="h-4 w-4 text-green-400" />,
  wav: <Music className="h-4 w-4 text-cyan-400" />,
  pdf: <FileText className="h-4 w-4 text-red-400" />,
  epub: <BookOpen className="h-4 w-4 text-orange-400" />,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function FileList() {
  const files = useFileStore((s) => s.files);
  const selectedFileIds = useFileStore((s) => s.selectedFileIds);
  const loading = useFileStore((s) => s.loading);
  const searchQuery = useFileStore((s) => s.searchQuery);
  const search = useFileStore((s) => s.search);
  const clearSearch = useFileStore((s) => s.clearSearch);
  const selectFile = useFileStore((s) => s.selectFile);
  const toggleSelection = useFileStore((s) => s.toggleSelection);
  const selectAll = useFileStore((s) => s.selectAll);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const sortField = useFileStore((s) => s.sortField);
  const sortDirection = useFileStore((s) => s.sortDirection);
  const setSort = useFileStore((s) => s.setSort);
  const fileTags = useFileStore((s) => s.fileTags);
  const copyTags = useClipboardStore((s) => s.copyTags);
  const hasCopiedTags = useClipboardStore((s) => s.hasCopiedTags);
  const copiedTags = useClipboardStore((s) => s.copiedTags);
  const play = usePlayerStore((s) => s.play);
  const openViewer = useViewerStore((s) => s.openViewer);
  const fileListView = useSettingsStore((s) => s.fileListView);
  const setFileListView = useSettingsStore((s) => s.setFileListView);
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = () => {
    search(searchInput);
  };

  const handleCopyTags = async (fileId: number) => {
    const tags = await window.electronAPI.getFileTags(fileId);
    copyTags(tags);
  };

  const handlePasteTags = async (fileIds: number[]) => {
    if (!hasCopiedTags) return;
    if (usePendingChangesStore.getState().applying) return;
    const changes = [];
    for (const fileId of fileIds) {
      const existingTags = await window.electronAPI.getFileTags(fileId);
      const file = files.find((f) => f.id === fileId);
      if (!file) continue;

      for (const [key, value] of Object.entries(copiedTags)) {
        const existing = existingTags.find((t) => t.key === key);
        changes.push({
          file_id: fileId,
          file_path: file.path,
          filename: file.filename,
          key,
          old_value: existing?.value ?? null,
          new_value: value,
        });
      }
    }
    if (changes.length > 0) {
      await window.electronAPI.queueBulkTagChanges(changes);
    }
  };

  const handleDoubleClick = (file: FileRecord) => {
    const category = getFileCategory(file.type);
    if (category === "audio") {
      play(file);
    } else if (category === "document") {
      openViewer(file);
    }
  };

  const handleSelectFile = (file: FileRecord, multi: boolean) => {
    selectFile(file.id, multi);
    if (getFileCategory(file.type) === "audio") {
      play(file);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 flex gap-2 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and tags..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => {
                setSearchInput("");
                clearSearch();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() =>
                setFileListView(fileListView === "list" ? "table" : "list")
              }
            >
              {fileListView === "list" ? (
                <Table2 className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Switch to {fileListView === "list" ? "table" : "list"} view
          </TooltipContent>
        </Tooltip>
        <Button variant="outline" size="sm" onClick={selectAll}>
          All
        </Button>
        {selectedFileIds.size > 0 && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear ({selectedFileIds.size})
          </Button>
        )}
      </div>

      {/* File count */}
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center gap-2">
        <span>{files.length} files</span>
        {selectedFileIds.size > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedFileIds.size} selected
          </Badge>
        )}
        {hasCopiedTags && (
          <Badge variant="outline" className="text-xs gap-1">
            <Copy className="h-3 w-3" />
            {Object.keys(copiedTags).length} tags copied
          </Badge>
        )}
      </div>

      {/* Table header (for table view) */}
      {fileListView === "table" && files.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
          <span className="w-6" />
          <span className="w-5" />
          <button
            className="flex items-center gap-1 flex-2 min-w-0 hover:text-foreground transition-colors"
            onClick={() => setSort("filename")}
          >
            Name <SortIcon field="filename" />
          </button>
          <button
            className="flex items-center gap-1 w-16 shrink-0 hover:text-foreground transition-colors"
            onClick={() => setSort("type")}
          >
            Type <SortIcon field="type" />
          </button>
          <span className="flex-1 min-w-0">Title</span>
          <span className="flex-1 min-w-0">Artist</span>
          <span className="flex-1 min-w-0 hidden xl:block">Album</span>
          <button
            className="flex items-center gap-1 w-20 shrink-0 hover:text-foreground transition-colors"
            onClick={() => setSort("size")}
          >
            Size <SortIcon field="size" />
          </button>
          <button
            className="items-center gap-1 w-24 shrink-0 hover:text-foreground transition-colors hidden lg:flex"
            onClick={() => setSort("modified_at")}
          >
            Modified <SortIcon field="modified_at" />
          </button>
        </div>
      )}

      {/* File list (virtualized) */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <FileListSkeleton view={fileListView} />
        ) : files.length === 0 ? (
          <EmptyFileList hasSearch={!!searchQuery} />
        ) : (
          <VirtualizedFileList
            files={files}
            selectedFileIds={selectedFileIds}
            fileTags={fileTags}
            fileListView={fileListView}
            hasCopiedTags={hasCopiedTags}
            onSelect={handleSelectFile}
            onToggle={toggleSelection}
            onDoubleClick={handleDoubleClick}
            onCopyTags={handleCopyTags}
            onPasteTags={handlePasteTags}
            onPlay={play}
            onOpenViewer={openViewer}
          />
        )}
      </div>
    </div>
  );
}

// ── Virtualized File List ──────────────────────────────────────────────

const TABLE_ROW_HEIGHT = 32;
const LIST_ROW_HEIGHT = 44;

function VirtualizedFileList({
  files,
  selectedFileIds,
  fileTags,
  fileListView,
  hasCopiedTags,
  onSelect,
  onToggle,
  onDoubleClick,
  onCopyTags,
  onPasteTags,
  onPlay,
  onOpenViewer,
}: {
  files: FileRecord[];
  selectedFileIds: Set<number>;
  fileTags: Record<number, Record<string, string>>;
  fileListView: "list" | "table";
  hasCopiedTags: boolean;
  onSelect: (file: FileRecord, multi: boolean) => void;
  onToggle: (id: number) => void;
  onDoubleClick: (file: FileRecord) => void;
  onCopyTags: (fileId: number) => Promise<void>;
  onPasteTags: (fileIds: number[]) => Promise<void>;
  onPlay: (file: FileRecord) => void;
  onOpenViewer: (file: FileRecord) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowHeight =
    fileListView === "table" ? TABLE_ROW_HEIGHT : LIST_ROW_HEIGHT;

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const file = files[virtualRow.index];
          const selected = selectedFileIds.has(file.id);
          const category = getFileCategory(file.type);

          if (fileListView === "table") {
            return (
              <div
                key={file.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <FileTableRow
                  file={file}
                  selected={selected}
                  tags={fileTags[file.id] ?? {}}
                  onSelect={(multi) => {
                    if (multi) onToggle(file.id);
                    else onSelect(file, false);
                  }}
                  onDoubleClick={() => onDoubleClick(file)}
                  onCopyTags={() => onCopyTags(file.id)}
                  onPasteTags={() =>
                    onPasteTags(
                      selectedFileIds.size > 0
                        ? Array.from(selectedFileIds)
                        : [file.id],
                    )
                  }
                  onPlay={category === "audio" ? () => onPlay(file) : undefined}
                  onOpenViewer={
                    category === "document"
                      ? () => onOpenViewer(file)
                      : undefined
                  }
                  hasCopiedTags={hasCopiedTags}
                />
              </div>
            );
          }

          return (
            <div
              key={file.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <FileListRow
                file={file}
                selected={selected}
                onSelect={(multi) => {
                  if (multi) onToggle(file.id);
                  else onSelect(file, false);
                }}
                onDoubleClick={() => onDoubleClick(file)}
                onCopyTags={() => onCopyTags(file.id)}
                onPasteTags={() =>
                  onPasteTags(
                    selectedFileIds.size > 0
                      ? Array.from(selectedFileIds)
                      : [file.id],
                  )
                }
                onPlay={category === "audio" ? () => onPlay(file) : undefined}
                onOpenViewer={
                  category === "document" ? () => onOpenViewer(file) : undefined
                }
                hasCopiedTags={hasCopiedTags}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────

function EmptyFileList({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
      {hasSearch ? (
        <>
          <Search className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">No results found</p>
          <p className="text-xs">Try a different search term</p>
        </>
      ) : (
        <>
          <div className="relative">
            <Tags className="h-12 w-12 opacity-20" />
            <FolderInput className="h-6 w-6 opacity-30 absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm font-medium">No files yet</p>
          <p className="text-xs text-center max-w-48">
            Add a library folder and scan it to see your files here
          </p>
        </>
      )}
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────

function FileListSkeleton({ view }: { view: "list" | "table" }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-[60%]" />
            {view === "list" && <Skeleton className="h-3 w-[40%]" />}
          </div>
          {view === "table" && (
            <>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20 hidden xl:block" />
              <Skeleton className="h-3 w-14" />
            </>
          )}
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Table Row (with tag columns) ───────────────────────────────────────

function FileTableRow({
  file,
  selected,
  tags,
  onSelect,
  onDoubleClick,
  onCopyTags,
  onPasteTags,
  onPlay,
  onOpenViewer,
  hasCopiedTags,
}: {
  file: FileRecord;
  selected: boolean;
  tags: Record<string, string>;
  onSelect: (multi: boolean) => void;
  onDoubleClick: () => void;
  onCopyTags: () => void;
  onPasteTags: () => void;
  onPlay?: () => void;
  onOpenViewer?: () => void;
  hasCopiedTags: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors text-xs ${
            selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
          }`}
          onClick={(e) => onSelect(e.metaKey || e.ctrlKey)}
          onDoubleClick={onDoubleClick}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(true)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
          <span className="shrink-0">
            {FILE_ICONS[file.type] || <FileText className="h-4 w-4" />}
          </span>
          <span className="flex-2 min-w-0 truncate text-sm">
            {file.filename}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] w-16 justify-center shrink-0"
          >
            {file.type.toUpperCase()}
          </Badge>
          <span className="flex-1 min-w-0 truncate text-muted-foreground">
            {tags.title || "—"}
          </span>
          <span className="flex-1 min-w-0 truncate text-muted-foreground">
            {tags.artist || tags.author || "—"}
          </span>
          <span className="flex-1 min-w-0 truncate text-muted-foreground hidden xl:block">
            {tags.album || "—"}
          </span>
          <span className="w-20 shrink-0 text-right text-muted-foreground">
            {formatSize(file.size)}
          </span>
          <span className="w-24 shrink-0 text-right text-muted-foreground hidden lg:block">
            {formatDate(file.modified_at)}
          </span>
        </div>
      </ContextMenuTrigger>
      <FileContextMenu
        onPlay={onPlay}
        onOpenViewer={onOpenViewer}
        onCopyTags={onCopyTags}
        onPasteTags={onPasteTags}
        onSelect={() => onSelect(false)}
        hasCopiedTags={hasCopiedTags}
      />
    </ContextMenu>
  );
}

// ── List Row (original compact view) ───────────────────────────────────

function FileListRow({
  file,
  selected,
  onSelect,
  onDoubleClick,
  onCopyTags,
  onPasteTags,
  onPlay,
  onOpenViewer,
  hasCopiedTags,
}: {
  file: FileRecord;
  selected: boolean;
  onSelect: (multi: boolean) => void;
  onDoubleClick: () => void;
  onCopyTags: () => void;
  onPasteTags: () => void;
  onPlay?: () => void;
  onOpenViewer?: () => void;
  hasCopiedTags: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
            selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
          }`}
          onClick={(e) => onSelect(e.metaKey || e.ctrlKey)}
          onDoubleClick={onDoubleClick}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(true)}
            onClick={(e) => e.stopPropagation()}
          />
          {FILE_ICONS[file.type] || <FileText className="h-4 w-4" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{file.filename}</p>
            <p className="text-xs text-muted-foreground truncate">
              {file.path}
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {file.type.toUpperCase()}
          </Badge>
        </div>
      </ContextMenuTrigger>
      <FileContextMenu
        onPlay={onPlay}
        onOpenViewer={onOpenViewer}
        onCopyTags={onCopyTags}
        onPasteTags={onPasteTags}
        onSelect={() => onSelect(false)}
        hasCopiedTags={hasCopiedTags}
      />
    </ContextMenu>
  );
}

// ── Shared Context Menu ────────────────────────────────────────────────

function FileContextMenu({
  onPlay,
  onOpenViewer,
  onCopyTags,
  onPasteTags,
  onSelect,
  hasCopiedTags,
}: {
  onPlay?: () => void;
  onOpenViewer?: () => void;
  onCopyTags: () => void;
  onPasteTags: () => void;
  onSelect: () => void;
  hasCopiedTags: boolean;
}) {
  return (
    <ContextMenuContent>
      {onPlay && (
        <ContextMenuItem onClick={onPlay}>
          <Play className="h-4 w-4 mr-2" />
          Play
        </ContextMenuItem>
      )}
      {onOpenViewer && (
        <ContextMenuItem onClick={onOpenViewer}>
          <Eye className="h-4 w-4 mr-2" />
          Open Viewer
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={onCopyTags}>
        <Copy className="h-4 w-4 mr-2" />
        Copy Tags
      </ContextMenuItem>
      {hasCopiedTags && (
        <ContextMenuItem onClick={onPasteTags}>
          <ClipboardPaste className="h-4 w-4 mr-2" />
          Paste Tags
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onSelect}>Select</ContextMenuItem>
    </ContextMenuContent>
  );
}
