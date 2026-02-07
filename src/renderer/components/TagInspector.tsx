import React, { useEffect, useState } from "react";
import {
  Save,
  Plus,
  Trash2,
  Undo2,
  Copy,
  ClipboardPaste,
  ChevronDown,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useFileStore, useClipboardStore } from "../stores";
import type { Tag, FileType } from "../../shared/types";
import {
  COMMON_TAG_FIELDS,
  COMMON_ATTRIBUTES_BY_TYPE,
} from "../../shared/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagRulesEditor } from "./TagRulesEditor";

export function TagInspector() {
  const files = useFileStore((s) => s.files);
  const selectedFileIds = useFileStore((s) => s.selectedFileIds);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editedTags, setEditedTags] = useState<Record<string, string>>({});
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const copyTags = useClipboardStore((s) => s.copyTags);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const hasCopiedTags = useClipboardStore((s) => s.hasCopiedTags);
  const copiedTags = useClipboardStore((s) => s.copiedTags);

  const selectedIds = Array.from(selectedFileIds);
  const singleFileId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedFile = singleFileId
    ? files.find((f) => f.id === singleFileId)
    : null;

  useEffect(() => {
    loadTags();
  }, [selectedFileIds]);

  const loadTags = async () => {
    if (selectedIds.length === 0) {
      setTags([]);
      return;
    }

    setLoading(true);
    try {
      if (singleFileId) {
        const t = await window.electronAPI.getFileTags(singleFileId);
        setTags(t);
        const initial: Record<string, string> = {};
        for (const tag of t) {
          initial[tag.key] = tag.value;
        }
        setEditedTags(initial);
        setRemovedKeys(new Set());
      } else {
        // Multi-select: show common tags
        const allTags =
          await window.electronAPI.getMultipleFileTags(selectedIds);
        // Find tags common to all selected files
        const tagSets = Object.values(allTags);
        if (tagSets.length > 0) {
          const commonKeys = new Set(tagSets[0].map((t) => t.key));
          for (let i = 1; i < tagSets.length; i++) {
            const keys = new Set(tagSets[i].map((t) => t.key));
            for (const k of commonKeys) {
              if (!keys.has(k)) commonKeys.delete(k);
            }
          }
          const commonTags = tagSets[0].filter((t) => commonKeys.has(t.key));
          setTags(commonTags);
          const initial: Record<string, string> = {};
          for (const tag of commonTags) {
            // Check if all files have the same value
            const allSame = tagSets.every((ts) =>
              ts.find((t) => t.key === tag.key && t.value === tag.value),
            );
            initial[tag.key] = allSame ? tag.value : "(mixed)";
          }
          setEditedTags(initial);
          setRemovedKeys(new Set());
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToQueue = async () => {
    const targetFiles = selectedIds
      .map((id) => files.find((f) => f.id === id))
      .filter(Boolean);

    const changes = [];
    for (const file of targetFiles) {
      if (!file) continue;
      const fileTags = await window.electronAPI.getFileTags(file.id);

      // Queue value changes
      for (const [key, value] of Object.entries(editedTags)) {
        if (value === "(mixed)") continue;
        const existing = fileTags.find((t) => t.key === key);
        if (existing?.value === value) continue; // No change

        changes.push({
          file_id: file.id,
          file_path: file.path,
          filename: file.filename,
          key,
          old_value: existing?.value ?? null,
          new_value: value,
        });
      }

      // Queue delete changes for removed tags
      for (const key of removedKeys) {
        const existing = fileTags.find((t) => t.key === key);
        if (existing) {
          changes.push({
            file_id: file.id,
            file_path: file.path,
            filename: file.filename,
            key,
            old_value: existing.value,
            new_value: null,
          });
        }
      }
    }

    if (changes.length > 0) {
      await window.electronAPI.queueBulkTagChanges(changes);
      setRemovedKeys(new Set());
    }
  };

  const handleAddCustomTag = () => {
    if (!customKey.trim()) return;
    setEditedTags((prev) => ({ ...prev, [customKey.trim()]: customValue }));
    setCustomKey("");
    setCustomValue("");
  };

  const handleRemoveTag = (key: string) => {
    // Track removal so we can queue a delete pending change
    const existsInFile = tags.some((t) => t.key === key);
    if (existsInFile) {
      setRemovedKeys((prev) => new Set(prev).add(key));
    }
    setEditedTags((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCopy = () => {
    const asTags: Tag[] = Object.entries(editedTags).map(([key, value], i) => ({
      id: i,
      file_id: 0,
      key,
      value,
      source: "native" as const,
    }));
    copyTags(asTags);
  };

  const handlePaste = () => {
    if (!hasCopiedTags) return;
    setEditedTags((prev) => ({ ...prev, ...copiedTags }));
  };

  const handleUndo = async () => {
    if (!singleFileId) return;
    await window.electronAPI.undoLastChange(singleFileId);
    await loadTags();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">
          {selectedIds.length === 1
            ? (selectedFile?.filename ?? "Tag Inspector")
            : `${selectedIds.length} files selected`}
        </h3>
        {selectedFile && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {selectedFile.path}
          </p>
        )}
      </div>

      {/* Actions bar */}
      <div className="px-3 py-2 flex gap-1 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1"
        >
          <Copy className="h-3 w-3" /> Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePaste}
          disabled={!hasCopiedTags}
          className="gap-1"
        >
          <ClipboardPaste className="h-3 w-3" /> Paste
        </Button>
        {singleFileId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            className="gap-1"
          >
            <Undo2 className="h-3 w-3" /> Undo
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowRulesDialog(true)}
          title="Tag Rules"
        >
          <Settings className="h-4 w-4" /> Tag Rules
        </Button>
      </div>

      {/* Tags editor */}
      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tags...</p>
        ) : (
          <div className="space-y-3">
            {/* Quick Add section for file-type-specific common attributes */}
            {selectedFile && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-accent transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showQuickAdd && "rotate-180",
                    )}
                  />
                  Quick Add ({selectedFile.type.toUpperCase()})
                </button>
                {showQuickAdd && (
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {COMMON_ATTRIBUTES_BY_TYPE[selectedFile.type as FileType]
                      .filter((field) => editedTags[field] === undefined)
                      .map((field) => (
                        <Button
                          key={field}
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditedTags((prev) => ({
                              ...prev,
                              [field]: "",
                            }))
                          }
                          className="justify-start text-xs h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {field.replace("_", " ")}
                        </Button>
                      ))}
                  </div>
                )}
                <Separator />
              </div>
            )}

            {/* Common fields */}
            {COMMON_TAG_FIELDS.map((field) => {
              const value = editedTags[field];
              if (value === undefined && !tags.find((t) => t.key === field)) {
                return null;
              }
              return (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize">
                    {field.replace("_", " ")}
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      value={value ?? ""}
                      onChange={(e) =>
                        setEditedTags((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemoveTag(field)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Custom tags */}
            {Object.entries(editedTags)
              .filter(([key]) => !COMMON_TAG_FIELDS.includes(key as any))
              .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">
                    <Badge variant="outline" className="text-xs">
                      {key}
                    </Badge>
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      value={value}
                      onChange={(e) =>
                        setEditedTags((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemoveTag(key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

            <Separator />

            {/* Add custom tag */}
            <div className="space-y-2">
              <Label className="text-xs">Add Custom Tag</Label>
              <div className="flex gap-1">
                <Input
                  placeholder="Key"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Value"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomTag()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddCustomTag}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Tag Rules Modal Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tag Rules</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <TagRulesEditor />
          </div>
        </DialogContent>
      </Dialog>

      {/* Save button */}
      <div className="p-3 border-t border-border">
        <Button onClick={handleSaveToQueue} className="w-full gap-2" size="sm">
          <Save className="h-4 w-4" />
          Queue Changes ({Object.keys(editedTags).length} tags)
        </Button>
      </div>
    </div>
  );
}
