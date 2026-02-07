import React from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLibraryStore } from "../stores";
import type { FolderNode } from "../../shared/types";

export function Sidebar() {
  const libraries = useLibraryStore((s) => s.libraries);
  const activeLibraryId = useLibraryStore((s) => s.activeLibraryId);
  const activeFolderPath = useLibraryStore((s) => s.activeFolderPath);
  const folderTree = useLibraryStore((s) => s.folderTree);
  const addLibrary = useLibraryStore((s) => s.addLibrary);
  const removeLibrary = useLibraryStore((s) => s.removeLibrary);
  const setActiveLibrary = useLibraryStore((s) => s.setActiveLibrary);
  const setActiveFolder = useLibraryStore((s) => s.setActiveFolder);

  const handleScan = async (libId: number) => {
    await window.electronAPI.scanLibrary(libId);
  };

  return (
    <div className="w-64 border-r border-border flex flex-col bg-sidebar-background">
      {/* Library header */}
      <div className="p-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-sidebar-foreground">
          Libraries
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={addLibrary}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {libraries.map((lib) => (
            <div key={lib.id}>
              <div
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm group ${
                  activeLibraryId === lib.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
                onClick={() => {
                  setActiveLibrary(lib.id);
                  setActiveFolder(null);
                }}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{lib.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScan(lib.id);
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLibrary(lib.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Folder tree for active library */}
              {activeLibraryId === lib.id && folderTree.length > 0 && (
                <div className="ml-2">
                  {folderTree.map((node) => (
                    <FolderTreeNode
                      key={node.path}
                      node={node}
                      activeFolderPath={activeFolderPath}
                      onSelect={setActiveFolder}
                      depth={0}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {libraries.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-8">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No libraries yet</p>
              <p className="mt-1">Click + to add a folder</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FolderTreeNode({
  node,
  activeFolderPath,
  onSelect,
  depth,
}: {
  node: FolderNode;
  activeFolderPath: string | null;
  onSelect: (path: string | null) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = React.useState(depth < 1);
  const isActive = activeFolderPath === node.path;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-sm cursor-pointer text-xs ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.path)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <Folder className="h-3 w-3 shrink-0" />
        <span className="truncate">{node.name}</span>
        <span className="text-muted-foreground ml-auto">{node.fileCount}</span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.path}
              node={child}
              activeFolderPath={activeFolderPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
