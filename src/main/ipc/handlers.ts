import * as fs from "node:fs";
import { ipcMain, dialog, BrowserWindow } from "electron";
import { IPC } from "../../shared/ipc-channels";
import type {
  PendingChange,
  TagRule,
  AlbumArtResult,
} from "../../shared/types";
import * as queries from "../db/queries";
import { scanLibrary } from "../services/scanner";
import { writeTagToFile, deleteTagFromFile } from "../services/tag-writer";
import { previewTagRule } from "../services/rule-engine";
import { v4 as uuidv4 } from "uuid";

// In-memory pending changes queue
let pendingChanges: PendingChange[] = [];

export function registerIpcHandlers(): void {
  // ─── Libraries ───────────────────────────────────────────────────

  ipcMain.handle(IPC.GET_LIBRARIES, () => {
    return queries.getLibraries();
  });

  ipcMain.handle(IPC.ADD_LIBRARY, (_e, libPath: string, name: string) => {
    return queries.addLibrary(libPath, name);
  });

  ipcMain.handle(IPC.REMOVE_LIBRARY, (_e, id: number) => {
    queries.removeLibrary(id);
  });

  ipcMain.handle(IPC.SELECT_FOLDER, async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Select Library Folder",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ─── Scanning ────────────────────────────────────────────────────

  ipcMain.handle(IPC.SCAN_LIBRARY, async (_e, libraryId: number) => {
    const lib = queries.getLibraries().find((l) => l.id === libraryId);
    if (!lib) throw new Error(`Library not found: ${libraryId}`);
    const win = BrowserWindow.getFocusedWindow();
    if (!win) throw new Error("No focused window");
    await scanLibrary(libraryId, lib.path, win);
  });

  // ─── Files ───────────────────────────────────────────────────────

  ipcMain.handle(IPC.GET_FILES, (_e, libraryId: number) => {
    return queries.getFiles(libraryId);
  });

  ipcMain.handle(IPC.GET_FILES_BY_FOLDER, (_e, folderPath: string) => {
    return queries.getFilesByFolder(folderPath);
  });

  ipcMain.handle(IPC.SEARCH_FILES, (_e, query: string) => {
    return queries.searchFiles(query);
  });

  // ─── Tags ────────────────────────────────────────────────────────

  ipcMain.handle(IPC.GET_FILE_TAGS, (_e, fileId: number) => {
    return queries.getFileTags(fileId);
  });

  ipcMain.handle(IPC.GET_MULTIPLE_FILE_TAGS, (_e, fileIds: number[]) => {
    return queries.getMultipleFileTags(fileIds);
  });

  // ─── Pending Changes ────────────────────────────────────────────

  ipcMain.handle(
    IPC.QUEUE_TAG_CHANGE,
    (_e, change: Omit<PendingChange, "id" | "status">) => {
      const pending: PendingChange = {
        ...change,
        id: uuidv4(),
        status: "pending",
      };
      pendingChanges.push(pending);
      return pending;
    },
  );

  ipcMain.handle(
    IPC.QUEUE_BULK_TAG_CHANGES,
    (_e, changes: Omit<PendingChange, "id" | "status">[]) => {
      const result: PendingChange[] = [];
      for (const change of changes) {
        const pending: PendingChange = {
          ...change,
          id: uuidv4(),
          status: "pending",
        };
        pendingChanges.push(pending);
        result.push(pending);
      }
      return result;
    },
  );

  ipcMain.handle(IPC.GET_PENDING_CHANGES, () => {
    return pendingChanges.filter((c) => c.status === "pending");
  });

  ipcMain.handle(IPC.APPLY_PENDING_CHANGES, async (_e, ids: string[]) => {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      const change = pendingChanges.find((c) => c.id === id);
      if (!change) {
        failed.push({ id, error: "Change not found" });
        continue;
      }

      try {
        if (change.new_value === null) {
          await deleteTagFromFile(change.file_id, change.key);
        } else {
          await writeTagToFile(change.file_id, change.key, change.new_value);
        }
        change.status = "applied";
        success.push(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ id, error: msg });
      }
    }

    // Clean up applied changes
    pendingChanges = pendingChanges.filter((c) => c.status === "pending");
    return { success, failed };
  });

  ipcMain.handle(IPC.REJECT_PENDING_CHANGES, (_e, ids: string[]) => {
    pendingChanges = pendingChanges.filter((c) => !ids.includes(c.id));
  });

  ipcMain.handle(IPC.CLEAR_PENDING_CHANGES, () => {
    pendingChanges = [];
  });

  // ─── Tag History ─────────────────────────────────────────────────

  ipcMain.handle(IPC.GET_TAG_HISTORY, (_e, fileId: number) => {
    return queries.getTagHistory(fileId);
  });

  ipcMain.handle(IPC.UNDO_LAST_CHANGE, async (_e, fileId: number) => {
    const last = queries.getLastTagChange(fileId);
    if (!last) throw new Error("No history to undo");

    if (last.operation === "update" || last.operation === "create") {
      if (last.old_value !== null) {
        await writeTagToFile(fileId, last.key, last.old_value);
      } else {
        queries.deleteFileTag(fileId, last.key);
      }
    } else if (last.operation === "delete" && last.old_value !== null) {
      await writeTagToFile(fileId, last.key, last.old_value);
    }
  });

  // ─── Tag Rules ───────────────────────────────────────────────────

  ipcMain.handle(IPC.GET_TAG_RULES, () => {
    return queries.getTagRules();
  });

  ipcMain.handle(
    IPC.CREATE_TAG_RULE,
    (_e, rule: Omit<TagRule, "id" | "created_at">) => {
      return queries.createTagRule(rule);
    },
  );

  ipcMain.handle(IPC.UPDATE_TAG_RULE, (_e, rule: TagRule) => {
    queries.updateTagRule(rule);
  });

  ipcMain.handle(IPC.DELETE_TAG_RULE, (_e, id: number) => {
    queries.deleteTagRule(id);
  });

  ipcMain.handle(
    IPC.PREVIEW_TAG_RULE,
    (_e, ruleId: number, fileIds: number[]) => {
      const rules = queries.getTagRules();
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) throw new Error(`Rule not found: ${ruleId}`);
      return previewTagRule(rule, fileIds);
    },
  );

  // ─── Folder Tree ─────────────────────────────────────────────────

  ipcMain.handle(IPC.GET_FOLDER_TREE, (_e, libraryId: number) => {
    return queries.getFolderTree(libraryId);
  });

  // ─── File Viewers ──────────────────────────────────────────────────

  ipcMain.handle(
    IPC.GET_ALBUM_ART,
    async (_e, filePath: string): Promise<AlbumArtResult | null> => {
      try {
        const mm = await import("music-metadata");
        const metadata = await mm.parseFile(filePath);
        const pictures = metadata.common.picture;
        if (!pictures || pictures.length === 0) return null;

        // Prefer front cover, fall back to first picture
        const cover =
          pictures.find((p) => p.type === "Cover (front)") ?? pictures[0];
        const base64 = Buffer.from(cover.data).toString("base64");
        return { data: base64, format: cover.format };
      } catch (err) {
        console.error("Failed to extract album art:", err);
        return null;
      }
    },
  );

  ipcMain.handle(
    IPC.READ_FILE_BASE64,
    async (_e, filePath: string): Promise<string> => {
      const buffer = fs.readFileSync(filePath);
      return buffer.toString("base64");
    },
  );

  ipcMain.handle(IPC.SELECT_IMAGE_FILE, async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      title: "Select Album Art Image",
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "bmp"] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(
    IPC.SET_ALBUM_ART,
    async (_e, filePath: string, imagePath: string): Promise<boolean> => {
      try {
        const ext = filePath.split(".").pop()?.toLowerCase();
        const imageBuffer = fs.readFileSync(imagePath);
        const imageExt = imagePath.split(".").pop()?.toLowerCase();
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          bmp: "image/bmp",
        };
        const mime = mimeMap[imageExt ?? ""] ?? "image/jpeg";

        if (ext === "mp3") {
          const NodeID3 = require("node-id3");
          const tags = {
            image: {
              mime,
              type: { id: 3, name: "front cover" },
              description: "Cover",
              imageBuffer,
            },
          };
          const result = NodeID3.update(tags, filePath);
          if (result !== true) {
            throw new Error("Failed to write album art to MP3");
          }
        } else {
          // For non-MP3 audio files, store the image path in sidecar
          const sidecarPath = filePath + ".meta.json";
          let existing: Record<string, unknown> = {};
          try {
            if (fs.existsSync(sidecarPath)) {
              existing = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
            }
          } catch {
            // Ignore parse errors
          }
          // Store album art as base64 in sidecar
          existing["_album_art"] = {
            data: imageBuffer.toString("base64"),
            format: mime,
          };
          fs.writeFileSync(
            sidecarPath,
            JSON.stringify(existing, null, 2),
            "utf-8",
          );
        }
        return true;
      } catch (err) {
        console.error("Failed to set album art:", err);
        return false;
      }
    },
  );

  ipcMain.handle(
    IPC.REMOVE_ALBUM_ART,
    async (_e, filePath: string): Promise<boolean> => {
      try {
        const ext = filePath.split(".").pop()?.toLowerCase();

        if (ext === "mp3") {
          const NodeID3 = require("node-id3");
          // read → strip image → removeTags → write back clean
          const tags = NodeID3.read(filePath);
          delete tags.image;
          // Remove raw frame data so write() doesn't re-add APIC
          delete tags.raw;
          // Strip all existing ID3 tags from the file
          NodeID3.removeTags(filePath);
          // Write back the remaining tags without the image
          const result = NodeID3.write(tags, filePath);
          if (result !== true) {
            throw new Error("Failed to remove album art from MP3");
          }
        } else {
          // Remove from sidecar
          const sidecarPath = filePath + ".meta.json";
          if (fs.existsSync(sidecarPath)) {
            const existing = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
            delete existing["_album_art"];
            if (Object.keys(existing).length === 0) {
              fs.unlinkSync(sidecarPath);
            } else {
              fs.writeFileSync(
                sidecarPath,
                JSON.stringify(existing, null, 2),
                "utf-8",
              );
            }
          }
        }
        return true;
      } catch (err) {
        console.error("Failed to remove album art:", err);
        return false;
      }
    },
  );
}
