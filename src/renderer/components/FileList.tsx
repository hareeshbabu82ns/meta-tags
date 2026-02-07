import React from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useFileStore, useClipboardStore, usePlayerStore } from "../stores";
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
  const copyTags = useClipboardStore((s) => s.copyTags);
  const hasCopiedTags = useClipboardStore((s) => s.hasCopiedTags);
  const copiedTags = useClipboardStore((s) => s.copiedTags);
  const play = usePlayerStore((s) => s.play);
  const [searchInput, setSearchInput] = React.useState("");

  const handleSearch = () => {
    search(searchInput);
  };

  const handleCopyTags = async (fileId: number) => {
    const tags = await window.electronAPI.getFileTags(fileId);
    copyTags(tags);
  };

  const handlePasteTags = async (fileIds: number[]) => {
    if (!hasCopiedTags) return;
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
    if (getFileCategory(file.type) === "audio") {
      play(file);
    }
    // For documents, we could open a viewer (future enhancement)
  };

  const handleSelectFile = (file: FileRecord, multi: boolean) => {
    selectFile(file.id, multi);
    // Show audio player for audio files
    if (getFileCategory(file.type) === "audio") {
      play(file);
    }
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

      {/* File list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            <Tags className="h-8 w-8 opacity-50" />
            <p>No files found</p>
            <p className="text-xs">Add a library and scan to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                selected={selectedFileIds.has(file.id)}
                onSelect={(multi) => {
                  if (multi) toggleSelection(file.id);
                  else handleSelectFile(file, false);
                }}
                onDoubleClick={() => handleDoubleClick(file)}
                onCopyTags={() => handleCopyTags(file.id)}
                onPasteTags={() =>
                  handlePasteTags(
                    selectedFileIds.size > 0
                      ? Array.from(selectedFileIds)
                      : [file.id],
                  )
                }
                onPlay={
                  getFileCategory(file.type) === "audio"
                    ? () => play(file)
                    : undefined
                }
                hasCopiedTags={hasCopiedTags}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
  onDoubleClick,
  onCopyTags,
  onPasteTags,
  onPlay,
  hasCopiedTags,
}: {
  file: FileRecord;
  selected: boolean;
  onSelect: (multi: boolean) => void;
  onDoubleClick: () => void;
  onCopyTags: () => void;
  onPasteTags: () => void;
  onPlay?: () => void;
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
      <ContextMenuContent>
        {onPlay && (
          <ContextMenuItem onClick={onPlay}>
            <Play className="h-4 w-4 mr-2" />
            Play
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
        <ContextMenuItem onClick={() => onSelect(false)}>
          Select
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
