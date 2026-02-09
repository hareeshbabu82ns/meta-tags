import React, { useEffect, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Trash2,
  ArrowRight,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { usePendingChangesStore } from "../stores";
import type { PendingChange } from "../../shared/types";

export function PendingChangesPanel() {
  const showPanel = usePendingChangesStore((s) => s.showPanel);
  const togglePanel = usePendingChangesStore((s) => s.togglePanel);
  const applying = usePendingChangesStore((s) => s.applying);
  const applyProgress = usePendingChangesStore((s) => s.applyProgress);
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadChanges = async () => {
    const c = await window.electronAPI.getPendingChanges();
    setChanges(c);
  };

  useEffect(() => {
    loadChanges();
    const interval = setInterval(loadChanges, 2000); // Poll for updates
    return () => clearInterval(interval);
  }, []);

  const toggleSelect = (id: string) => {
    if (applying) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (applying) return;
    setSelectedIds(new Set(changes.map((c) => c.id)));
  };

  const handleApply = () => {
    const ids =
      selectedIds.size > 0 ? Array.from(selectedIds) : changes.map((c) => c.id);
    usePendingChangesStore.setState({
      applying: true,
      applyProgress: { applied: 0, total: ids.length, currentFile: "" },
    });
    // Fire-and-forget — completion handled by onApplyComplete in App.tsx
    window.electronAPI.applyPendingChanges(ids);
  };

  // Listen for apply completion to update local state
  useEffect(() => {
    const handler = (e: Event) => {
      const { success, failed } = (e as CustomEvent).detail as {
        success: string[];
        failed: { id: string; error: string }[];
      };
      if (failed.length > 0) {
        toast.warning(
          `Applied ${success.length} changes, ${failed.length} failed`,
        );
      } else {
        toast.success(`Applied ${success.length} changes successfully`);
      }
      loadChanges();
      setSelectedIds(new Set());
    };
    window.addEventListener("meta-tags:apply-complete", handler);
    return () =>
      window.removeEventListener("meta-tags:apply-complete", handler);
  }, []);

  const handleReject = async () => {
    if (applying) return;
    const ids =
      selectedIds.size > 0 ? Array.from(selectedIds) : changes.map((c) => c.id);
    await window.electronAPI.rejectPendingChanges(ids);
    toast.info(`Rejected ${ids.length} changes`);
    await loadChanges();
    setSelectedIds(new Set());
  };

  const handleClear = async () => {
    if (applying) return;
    await window.electronAPI.clearPendingChanges();
    setChanges([]);
    setSelectedIds(new Set());
    toast.info("Cleared all pending changes");
  };

  const progressPercent = applyProgress
    ? Math.round(
        (applyProgress.applied / Math.max(applyProgress.total, 1)) * 100,
      )
    : 0;

  return (
    <div className="border-t border-border">
      {/* Toggle bar */}
      <button
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
        onClick={togglePanel}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Pending Changes</span>
          {changes.length > 0 && (
            <Badge variant="default" className="text-xs">
              {changes.length}
            </Badge>
          )}
          {applying && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
        </div>
        {showPanel ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      {showPanel && (
        <div className="border-t border-border relative">
          {/* Progress overlay when applying */}
          {applying && applyProgress && (
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                <span className="text-xs font-medium">
                  Applying changes… {applyProgress.applied}/
                  {applyProgress.total}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              {applyProgress.currentFile && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {applyProgress.currentFile}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-2 flex gap-2 border-b border-border">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={changes.length === 0 || applying}
              className="gap-1"
            >
              {applying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {applying
                ? "Applying…"
                : `Apply ${selectedIds.size > 0 ? `(${selectedIds.size})` : "All"}`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={changes.length === 0 || applying}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={changes.length === 0 || applying}
            >
              Select All
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={changes.length === 0 || applying}
              className="text-destructive gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          </div>

          {/* Changes list */}
          <ScrollArea className="max-h-48">
            {changes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                <ClipboardList className="h-8 w-8 opacity-20" />
                <p className="text-xs">No pending changes</p>
                <p className="text-[10px] opacity-70">
                  Edit tags and queue changes to see them here
                </p>
              </div>
            ) : (
              <div
                className={`divide-y divide-border ${applying ? "opacity-50 pointer-events-none" : ""}`}
              >
                {changes.map((change) => (
                  <div
                    key={change.id}
                    className={`flex items-center gap-3 px-4 py-1.5 text-xs ${
                      selectedIds.has(change.id) ? "bg-accent/50" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedIds.has(change.id)}
                      onCheckedChange={() => toggleSelect(change.id)}
                      disabled={applying}
                    />
                    <span className="truncate w-32 text-muted-foreground">
                      {change.filename}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {change.key}
                    </Badge>
                    <span className="truncate text-muted-foreground">
                      {change.old_value || "(empty)"}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span
                      className={`truncate font-medium ${change.new_value === null ? "text-destructive" : ""}`}
                    >
                      {change.new_value === null
                        ? "(delete)"
                        : change.new_value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
