/**
 * Integration tests for database queries.
 *
 * These tests use an in-memory SQLite database with the same schema
 * as production. We mock the `getDb()` function to return our test db
 * so that all query functions work against test data.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import {
  createTestDb,
  seedLibrary,
  seedFile,
  seedTag,
} from "../helpers/test-db";

// Mock the database module to use our test db
let testDb: Database.Database;

vi.mock("../../src/main/db/database", () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

// Import queries AFTER mock is set up
const queries = await import("../../src/main/db/queries");

describe("Database Queries", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  // ─── Libraries ──────────────────────────────────────────────────

  describe("Libraries", () => {
    it("should return empty array when no libraries exist", () => {
      const libs = queries.getLibraries();
      expect(libs).toEqual([]);
    });

    it("should add and retrieve a library", () => {
      const lib = queries.addLibrary("/music/collection", "My Music");
      expect(lib).toMatchObject({
        path: "/music/collection",
        name: "My Music",
      });
      expect(lib.id).toBeGreaterThan(0);

      const libs = queries.getLibraries();
      expect(libs).toHaveLength(1);
      expect(libs[0].name).toBe("My Music");
    });

    it("should remove a library", () => {
      const lib = queries.addLibrary("/music", "Music");
      queries.removeLibrary(lib.id);
      expect(queries.getLibraries()).toHaveLength(0);
    });

    it("should cascade delete files when library is removed", () => {
      const libId = seedLibrary(testDb, "/music", "Music");
      seedFile(testDb, libId);
      expect(queries.getFiles(libId)).toHaveLength(1);

      queries.removeLibrary(libId);
      // After cascade, files should be gone
      expect(queries.getFiles(libId)).toHaveLength(0);
    });

    it("should enforce unique library paths", () => {
      queries.addLibrary("/music", "Music 1");
      expect(() => queries.addLibrary("/music", "Music 2")).toThrow();
    });
  });

  // ─── Files ──────────────────────────────────────────────────────

  describe("Files", () => {
    let libId: number;

    beforeEach(() => {
      libId = seedLibrary(testDb);
    });

    it("should upsert a file", () => {
      const file = queries.upsertFile(
        libId,
        "/test/music/track.mp3",
        "track.mp3",
        "mp3",
        5000000,
        "2025-06-01 10:00:00",
      );
      expect(file).toMatchObject({
        library_id: libId,
        filename: "track.mp3",
        type: "mp3",
        size: 5000000,
      });
    });

    it("should update existing file on upsert (same path)", () => {
      queries.upsertFile(
        libId,
        "/test/music/track.mp3",
        "track.mp3",
        "mp3",
        1000,
        "2025-01-01",
      );
      const updated = queries.upsertFile(
        libId,
        "/test/music/track.mp3",
        "track.mp3",
        "mp3",
        2000,
        "2025-06-01",
      );
      expect(updated.size).toBe(2000);
      // Should still be just one file
      expect(queries.getFiles(libId)).toHaveLength(1);
    });

    it("should get files by library", () => {
      seedFile(testDb, libId, { path: "/test/music/a.mp3", filename: "a.mp3" });
      seedFile(testDb, libId, {
        path: "/test/music/b.flac",
        filename: "b.flac",
        type: "flac",
      });
      const files = queries.getFiles(libId);
      expect(files).toHaveLength(2);
    });

    it("should get files by folder", () => {
      seedFile(testDb, libId, {
        path: "/test/music/rock/a.mp3",
        filename: "a.mp3",
      });
      seedFile(testDb, libId, {
        path: "/test/music/rock/b.mp3",
        filename: "b.mp3",
      });
      seedFile(testDb, libId, {
        path: "/test/music/rock/sub/c.mp3",
        filename: "c.mp3",
      });
      // getFilesByFolder should only return direct children
      const files = queries.getFilesByFolder("/test/music/rock");
      expect(files).toHaveLength(2);
    });

    it("should search files by filename", () => {
      seedFile(testDb, libId, {
        path: "/test/music/beethoven.mp3",
        filename: "beethoven.mp3",
      });
      seedFile(testDb, libId, {
        path: "/test/music/mozart.mp3",
        filename: "mozart.mp3",
      });
      const results = queries.searchFiles("beethoven");
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe("beethoven.mp3");
    });

    it("should search files by tag value", () => {
      const fileId = seedFile(testDb, libId, {
        path: "/test/music/track1.mp3",
        filename: "track1.mp3",
      });
      seedTag(testDb, fileId, "artist", "The Beatles");
      const results = queries.searchFiles("Beatles");
      expect(results).toHaveLength(1);
    });

    it("should detect files needing rescan", () => {
      seedFile(testDb, libId, {
        path: "/test/music/song.mp3",
        modifiedAt: "2025-01-01",
      });
      // Same modification date — no rescan needed
      expect(
        queries.getFileNeedingRescan("/test/music/song.mp3", "2025-01-01"),
      ).toBe(false);
      // Different date — needs rescan
      expect(
        queries.getFileNeedingRescan("/test/music/song.mp3", "2025-06-01"),
      ).toBe(true);
      // Non-existent file — needs scan
      expect(
        queries.getFileNeedingRescan("/test/music/new.mp3", "2025-01-01"),
      ).toBe(true);
    });
  });

  // ─── Tags ───────────────────────────────────────────────────────

  describe("Tags", () => {
    let libId: number;
    let fileId: number;

    beforeEach(() => {
      libId = seedLibrary(testDb);
      fileId = seedFile(testDb, libId);
    });

    it("should upsert and retrieve tags", () => {
      queries.upsertTag(fileId, "title", "My Song");
      queries.upsertTag(fileId, "artist", "Test Artist");
      const tags = queries.getFileTags(fileId);
      expect(tags).toHaveLength(2);
      expect(tags.find((t) => t.key === "title")?.value).toBe("My Song");
    });

    it("should update existing tag on upsert", () => {
      queries.upsertTag(fileId, "title", "Original");
      queries.upsertTag(fileId, "title", "Updated");
      const tags = queries.getFileTags(fileId);
      expect(tags).toHaveLength(1);
      expect(tags[0].value).toBe("Updated");
    });

    it("should get multiple file tags", () => {
      const fileId2 = seedFile(testDb, libId, {
        path: "/test/music/song2.mp3",
        filename: "song2.mp3",
      });
      queries.upsertTag(fileId, "title", "Song 1");
      queries.upsertTag(fileId2, "title", "Song 2");

      const result = queries.getMultipleFileTags([fileId, fileId2]);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result[fileId]).toHaveLength(1);
      expect(result[fileId2]).toHaveLength(1);
    });

    it("should delete a specific tag", () => {
      queries.upsertTag(fileId, "title", "Song");
      queries.upsertTag(fileId, "artist", "Artist");
      queries.deleteFileTag(fileId, "title");
      const tags = queries.getFileTags(fileId);
      expect(tags).toHaveLength(1);
      expect(tags[0].key).toBe("artist");
    });

    it("should clear all tags for a file", () => {
      queries.upsertTag(fileId, "title", "Song");
      queries.upsertTag(fileId, "artist", "Artist");
      queries.clearFileTags(fileId);
      expect(queries.getFileTags(fileId)).toHaveLength(0);
    });
  });

  // ─── Tag History ────────────────────────────────────────────────

  describe("Tag History", () => {
    let libId: number;
    let fileId: number;

    beforeEach(() => {
      libId = seedLibrary(testDb);
      fileId = seedFile(testDb, libId);
    });

    it("should record and retrieve tag history", () => {
      queries.addTagHistory(fileId, "title", null, "New Title", "create");
      queries.addTagHistory(
        fileId,
        "title",
        "New Title",
        "Updated Title",
        "update",
      );

      const history = queries.getTagHistory(fileId);
      expect(history).toHaveLength(2);
      // Both entries should be present
      const ops = history.map((h) => h.operation);
      expect(ops).toContain("create");
      expect(ops).toContain("update");
    });

    it("should get last tag change", () => {
      queries.addTagHistory(fileId, "title", null, "First", "create");
      queries.addTagHistory(fileId, "artist", null, "Artist", "create");

      const last = queries.getLastTagChange(fileId);
      expect(last).toBeDefined();
      // Both inserted at same timestamp — last inserted has highest id
      // The query orders by timestamp DESC LIMIT 1, but since timestamps
      // are identical in tests, the result can be either one.
      expect(["title", "artist"]).toContain(last?.key);
    });

    it("should return undefined when no history exists", () => {
      expect(queries.getLastTagChange(fileId)).toBeUndefined();
    });
  });

  // ─── Tag Rules ──────────────────────────────────────────────────

  describe("Tag Rules", () => {
    it("should create and retrieve rules", () => {
      const rule = queries.createTagRule({
        name: "Extract Track",
        source_field: "filename",
        regex: "^(\\d+)",
        target_field: "track",
        template: "$1",
        is_preset: false,
      });
      expect(rule.id).toBeGreaterThan(0);
      expect(rule.name).toBe("Extract Track");

      const rules = queries.getTagRules();
      expect(rules).toHaveLength(1);
    });

    it("should update a rule", () => {
      const rule = queries.createTagRule({
        name: "Old Name",
        source_field: "filename",
        regex: ".*",
        target_field: "title",
        template: "$0",
        is_preset: false,
      });

      queries.updateTagRule({ ...rule, name: "New Name" });
      const updated = queries.getTagRules();
      expect(updated[0].name).toBe("New Name");
    });

    it("should delete a rule", () => {
      const rule = queries.createTagRule({
        name: "Temp Rule",
        source_field: "filename",
        regex: ".*",
        target_field: "title",
        template: "$0",
        is_preset: false,
      });
      queries.deleteTagRule(rule.id);
      expect(queries.getTagRules()).toHaveLength(0);
    });
  });

  // ─── Folder Tree ────────────────────────────────────────────────

  describe("Folder Tree", () => {
    it("should build folder tree from files", () => {
      const libId = seedLibrary(testDb, "/music", "Music");
      seedFile(testDb, libId, { path: "/music/rock/a.mp3", filename: "a.mp3" });
      seedFile(testDb, libId, { path: "/music/rock/b.mp3", filename: "b.mp3" });
      seedFile(testDb, libId, { path: "/music/jazz/c.mp3", filename: "c.mp3" });

      const tree = queries.getFolderTree(libId);
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("music");
      expect(tree[0].children).toHaveLength(2);
      const rock = tree[0].children.find((c) => c.name === "rock");
      expect(rock?.fileCount).toBe(2);
    });

    it("should return empty tree for non-existent library", () => {
      const tree = queries.getFolderTree(9999);
      expect(tree).toEqual([]);
    });
  });
});
