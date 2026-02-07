import React, { useEffect, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { usePendingChangesStore } from "../stores";
import type { PendingChange } from "../../shared/types";

export function PendingChangesPanel() {
  const showPanel = usePendingChangesStore((s) => s.showPanel);
  const togglePanel = usePendingChangesStore((s) => s.togglePanel);
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(changes.map((c) => c.id)));
  };

  const handleApply = async () => {
    const ids =
      selectedIds.size > 0 ? Array.from(selectedIds) : changes.map((c) => c.id);
    setApplying(true);
    try {
      const result = await window.electronAPI.applyPendingChanges(ids);
      if (result.failed.length > 0) {
        console.error("Some changes failed:", result.failed);
      }
      await loadChanges();
      setSelectedIds(new Set());
    } finally {
      setApplying(false);
    }
  };

  const handleReject = async () => {
    const ids =
      selectedIds.size > 0 ? Array.from(selectedIds) : changes.map((c) => c.id);
    await window.electronAPI.rejectPendingChanges(ids);
    await loadChanges();
    setSelectedIds(new Set());
  };

  const handleClear = async () => {
    await window.electronAPI.clearPendingChanges();
    setChanges([]);
    setSelectedIds(new Set());
  };

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
        </div>
        {showPanel ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      {showPanel && (
        <div className="border-t border-border">
          {/* Actions */}
          <div className="px-4 py-2 flex gap-2 border-b border-border">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={changes.length === 0 || applying}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Apply {selectedIds.size > 0 ? `(${selectedIds.size})` : "All"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={changes.length === 0}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={changes.length === 0}
            >
              Select All
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={changes.length === 0}
              className="text-destructive gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          </div>

          {/* Changes list */}
          <ScrollArea className="max-h-48">
            {changes.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No pending changes
              </div>
            ) : (
              <div className="divide-y divide-border">
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
                    <span className="truncate font-medium">
                      {change.new_value}
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
