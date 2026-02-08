import * as fs from "node:fs";
import * as path from "node:path";
import { BrowserWindow } from "electron";
import { SUPPORTED_EXTENSIONS, getFileType } from "../../shared/types";
import type { ScanProgress } from "../../shared/types";
import { IPC } from "../../shared/ipc-channels";
import {
  upsertFile,
  upsertTag,
  clearFileTags,
  getFileNeedingRescan,
} from "../db/queries";

export async function scanLibrary(
  libraryId: number,
  libraryPath: string,
  win: BrowserWindow,
): Promise<void> {
  const files = collectFiles(libraryPath);
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const filename = path.basename(filePath);
    const stat = fs.statSync(filePath);
    const modifiedAt = stat.mtime.toISOString();

    // Send progress
    const progress: ScanProgress = { total, scanned: i + 1, current: filename };
    win.webContents.send(IPC.SCAN_PROGRESS, progress);

    // Skip if file hasn't changed
    if (!getFileNeedingRescan(filePath, modifiedAt)) {
      continue;
    }

    const type = getFileType(filename);
    if (!type) continue;

    const fileRecord = upsertFile(
      libraryId,
      filePath,
      filename,
      type,
      stat.size,
      modifiedAt,
    );

    // Clear old tags and read fresh
    clearFileTags(fileRecord.id);

    try {
      await readAndStoreMetadata(fileRecord.id, filePath, type);
    } catch (err) {
      console.error(`Failed to read metadata for ${filePath}:`, err);
    }
  }

  win.webContents.send(IPC.SCAN_COMPLETE, libraryId);
}

function collectFiles(dirPath: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Skip inaccessible directories
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return results;
}

async function readAndStoreMetadata(
  fileId: number,
  filePath: string,
  type: string,
): Promise<void> {
  if (["mp3", "flac", "ogg", "wav"].includes(type)) {
    await readAudioMetadata(fileId, filePath);
  } else if (type === "pdf") {
    await readPdfMetadata(fileId, filePath);
  } else if (type === "epub") {
    await readEpubMetadata(fileId, filePath);
  }
}

async function readAudioMetadata(
  fileId: number,
  filePath: string,
): Promise<void> {
  // music-metadata is ESM, use dynamic import
  const mm = await import("music-metadata");
  const metadata = await mm.parseFile(filePath);
  const { common } = metadata;

  if (common.title) upsertTag(fileId, "title", common.title);
  if (common.artist) upsertTag(fileId, "artist", common.artist);
  if (common.album) upsertTag(fileId, "album", common.album);
  if (common.genre && common.genre.length > 0)
    upsertTag(fileId, "genre", common.genre.join(", "));
  if (common.year) upsertTag(fileId, "year", String(common.year));
  if (common.track.no) upsertTag(fileId, "track", String(common.track.no));
  if (common.disk.no) upsertTag(fileId, "disc", String(common.disk.no));
  if (common.comment && common.comment.length > 0)
    upsertTag(fileId, "comment", common.comment[0]);
  if (common.albumartist) upsertTag(fileId, "album_artist", common.albumartist);
  if (common.composer && common.composer.length > 0)
    upsertTag(fileId, "composer", common.composer.join(", "));

  // Store duration as a tag too
  if (metadata.format.duration) {
    upsertTag(fileId, "duration", String(Math.round(metadata.format.duration)));
  }
}

async function readPdfMetadata(
  fileId: number,
  filePath: string,
): Promise<void> {
  try {
    // pdf-parse may not be ESM compatible - use createRequire as fallback
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer, { max: 0 }); // Don't parse text, just metadata

    if (data.info) {
      if (data.info.Title) upsertTag(fileId, "title", data.info.Title);
      if (data.info.Author) upsertTag(fileId, "author", data.info.Author);
      if (data.info.Subject) upsertTag(fileId, "subject", data.info.Subject);
      if (data.info.Keywords) upsertTag(fileId, "keywords", data.info.Keywords);
      if (data.info.Creator) upsertTag(fileId, "publisher", data.info.Creator);
    }
    if (data.numpages) upsertTag(fileId, "pages", String(data.numpages));
  } catch (err) {
    console.error("PDF parse error:", err);
  }
}

async function readEpubMetadata(
  fileId: number,
  filePath: string,
): Promise<void> {
  try {
    // jszip is ESM, use dynamic import
    const buffer = fs.readFileSync(filePath);

    // Parse EPUB as ZIP and find OPF
    const jszipModule = await import("jszip");
    const JSZip = jszipModule.default || jszipModule;
    const zip = await JSZip.loadAsync(buffer);

    // Find container.xml
    const containerXml = await zip
      .file("META-INF/container.xml")
      ?.async("string");
    if (!containerXml) return;

    // Extract rootfile path
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) return;

    const opfContent = await zip.file(rootfileMatch[1])?.async("string");
    if (!opfContent) return;

    // Simple regex-based metadata extraction from OPF
    const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
    const authorMatch = opfContent.match(
      /<dc:creator[^>]*>([^<]+)<\/dc:creator>/,
    );
    const languageMatch = opfContent.match(
      /<dc:language[^>]*>([^<]+)<\/dc:language>/,
    );
    const descMatch = opfContent.match(
      /<dc:description[^>]*>([^<]+)<\/dc:description>/,
    );
    const publisherMatch = opfContent.match(
      /<dc:publisher[^>]*>([^<]+)<\/dc:publisher>/,
    );
    const subjectMatches = opfContent.matchAll(
      /<dc:subject[^>]*>([^<]+)<\/dc:subject>/g,
    );
    const dateMatch = opfContent.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/);

    if (titleMatch) upsertTag(fileId, "title", titleMatch[1]);
    if (authorMatch) upsertTag(fileId, "author", authorMatch[1]);
    if (languageMatch) upsertTag(fileId, "language", languageMatch[1]);
    if (descMatch) upsertTag(fileId, "description", descMatch[1]);
    if (publisherMatch) upsertTag(fileId, "publisher", publisherMatch[1]);
    if (dateMatch) upsertTag(fileId, "year", dateMatch[1]);

    const subjects: string[] = [];
    for (const m of subjectMatches) {
      subjects.push(m[1]);
    }
    if (subjects.length > 0) upsertTag(fileId, "genre", subjects.join(", "));
  } catch (err) {
    console.error("EPUB parse error:", err);
  }
}
