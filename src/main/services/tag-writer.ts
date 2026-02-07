import * as fs from "node:fs";
import { getFileType } from "../../shared/types";
import {
  upsertTag,
  addTagHistory,
  getFileTags,
  getFileById,
} from "../db/queries";

/**
 * Write a single tag to a file. Returns true on success.
 * This writes to the actual file on disk and updates the DB.
 */
export async function writeTagToFile(
  fileId: number,
  key: string,
  newValue: string,
): Promise<boolean> {
  const file = getFileById(fileId);
  if (!file) throw new Error(`File not found: ${fileId}`);

  const type = getFileType(file.filename);
  if (!type) throw new Error(`Unknown file type: ${file.filename}`);

  // Get old value for history
  const existingTags = getFileTags(fileId);
  const existing = existingTags.find((t) => t.key === key);
  const oldValue = existing?.value ?? null;

  // Write to file
  if (["mp3", "flac", "ogg", "wav"].includes(type)) {
    await writeAudioTag(file.path, type, key, newValue);
  } else if (type === "pdf") {
    // PDF tag writing is limited; store in sidecar
    await writeSidecarTag(file.path, key, newValue);
  } else if (type === "epub") {
    // EPUB tag writing is complex; store in sidecar
    await writeSidecarTag(file.path, key, newValue);
  }

  // Update database
  addTagHistory(
    fileId,
    key,
    oldValue,
    newValue,
    oldValue ? "update" : "create",
  );
  upsertTag(
    fileId,
    key,
    newValue,
    type === "pdf" || type === "epub" ? "sidecar" : "native",
  );

  return true;
}

async function writeAudioTag(
  filePath: string,
  type: string,
  key: string,
  value: string,
): Promise<void> {
  if (type === "mp3") {
    // Use node-id3 for MP3 files
    const NodeID3 = require("node-id3");

    // Map our tag keys to ID3 frame names
    const id3Map: Record<string, string> = {
      title: "title",
      artist: "artist",
      album: "album",
      genre: "genre",
      year: "year",
      track: "trackNumber",
      comment: "comment",
      album_artist: "performerInfo",
      composer: "composer",
      disc: "partOfSet",
    };

    const id3Key = id3Map[key];
    if (id3Key) {
      const tags: Record<string, unknown> = {};
      if (key === "comment") {
        tags[id3Key] = { language: "eng", text: value };
      } else {
        tags[id3Key] = value;
      }
      const result = NodeID3.update(tags, filePath);
      if (result !== true) {
        throw new Error(`Failed to write ID3 tag: ${key}`);
      }
    }
  }
  // For FLAC/OGG/WAV — we'd use ffmpeg, but for now just write sidecar
  // This keeps the implementation working without requiring ffmpeg
  if (["flac", "ogg", "wav"].includes(type)) {
    await writeSidecarTag(filePath, key, value);
  }
}

async function writeSidecarTag(
  filePath: string,
  key: string,
  value: string,
): Promise<void> {
  const sidecarPath = filePath + ".meta.json";
  let existing: Record<string, string> = {};

  try {
    if (fs.existsSync(sidecarPath)) {
      existing = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
    }
  } catch {
    // Ignore parse errors
  }

  existing[key] = value;
  fs.writeFileSync(sidecarPath, JSON.stringify(existing, null, 2), "utf-8");
}
