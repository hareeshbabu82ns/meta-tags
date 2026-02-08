import { useEffect } from "react";
import { toast } from "sonner";
import {
  useFileStore,
  useClipboardStore,
  usePendingChangesStore,
} from "../stores";
import type { Tag } from "../../shared/types";

/**
 * Global keyboard shortcut handler for the app.
 * Attaches listeners on mount and cleans up on unmount.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      // Don't intercept shortcuts when typing in inputs
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // ── Cmd+A — Select All (always works in file list context) ──
      if (isMod && e.key === "a" && !e.shiftKey && !isEditing) {
        e.preventDefault();
        useFileStore.getState().selectAll();
        toast.info("All files selected");
        return;
      }

      // ── Cmd+C — Copy Tags ──
      if (isMod && e.key === "c" && !e.shiftKey && !isEditing) {
        e.preventDefault();
        const selectedIds = useFileStore.getState().selectedFileIds;
        if (selectedIds.size === 0) return;

        const firstId = Array.from(selectedIds)[0];
        try {
          const tags = await window.electronAPI.getFileTags(firstId);
          useClipboardStore.getState().copyTags(tags);
          toast.success(`Copied ${tags.length} tags`);
        } catch {
          toast.error("Failed to copy tags");
        }
        return;
      }

      // ── Cmd+V — Paste Tags ──
      if (isMod && e.key === "v" && !e.shiftKey && !isEditing) {
        e.preventDefault();
        const { hasCopiedTags, copiedTags } = useClipboardStore.getState();
        if (!hasCopiedTags) {
          toast.info("No tags copied");
          return;
        }

        const selectedIds = useFileStore.getState().selectedFileIds;
        const files = useFileStore.getState().files;
        if (selectedIds.size === 0) {
          toast.info("Select files to paste tags to");
          return;
        }

        try {
          const changes = [];
          for (const fileId of selectedIds) {
            const existingTags = await window.electronAPI.getFileTags(fileId);
            const file = files.find((f) => f.id === fileId);
            if (!file) continue;

            for (const [key, value] of Object.entries(copiedTags)) {
              const existing = existingTags.find((t: Tag) => t.key === key);
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
            toast.success(
              `Pasted tags to ${selectedIds.size} file${selectedIds.size > 1 ? "s" : ""}`,
            );
          }
        } catch {
          toast.error("Failed to paste tags");
        }
        return;
      }

      // ── Cmd+Z — Undo Last Change ──
      if (isMod && e.key === "z" && !e.shiftKey && !isEditing) {
        e.preventDefault();
        const selectedIds = useFileStore.getState().selectedFileIds;
        if (selectedIds.size !== 1) {
          toast.info("Select a single file to undo");
          return;
        }

        const fileId = Array.from(selectedIds)[0];
        try {
          await window.electronAPI.undoLastChange(fileId);
          toast.success("Undid last change");
        } catch {
          toast.error("Nothing to undo");
        }
        return;
      }

      // ── Cmd+S — Queue Changes (triggers save in TagInspector) ──
      if (isMod && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        // Dispatch a custom event that TagInspector listens for
        window.dispatchEvent(new CustomEvent("meta-tags:save"));
        return;
      }

      // ── Cmd+Shift+A — Apply All Pending Changes ──
      if (isMod && e.key === "A" && e.shiftKey) {
        e.preventDefault();
        try {
          const changes = await window.electronAPI.getPendingChanges();
          if (changes.length === 0) {
            toast.info("No pending changes to apply");
            return;
          }
          const ids = changes.map((c) => c.id);
          const result = await window.electronAPI.applyPendingChanges(ids);
          if (result.failed.length > 0) {
            toast.warning(
              `Applied ${result.success.length}, failed ${result.failed.length}`,
            );
          } else {
            toast.success(`Applied ${result.success.length} changes`);
          }
          // Open panel to show result
          if (!usePendingChangesStore.getState().showPanel) {
            usePendingChangesStore.getState().togglePanel();
          }
        } catch {
          toast.error("Failed to apply changes");
        }
        return;
      }

      // ── Escape — Clear Selection ──
      if (e.key === "Escape" && !isEditing) {
        useFileStore.getState().clearSelection();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
