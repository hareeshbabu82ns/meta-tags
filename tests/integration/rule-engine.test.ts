/**
 * Tests for the rule engine's tag rule preview functionality.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import {
  createTestDb,
  seedLibrary,
  seedFile,
  seedTag,
} from "../helpers/test-db";

let testDb: Database.Database;

vi.mock("../../src/main/db/database", () => ({
  getDb: () => testDb,
  closeDb: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
}));

const { previewTagRule } = await import("../../src/main/services/rule-engine");

describe("Rule Engine", () => {
  let libId: number;

  beforeEach(() => {
    testDb = createTestDb();
    libId = seedLibrary(testDb);
  });

  it("should extract track number from filename", () => {
    const fileId = seedFile(testDb, libId, {
      path: "/music/01 - Hello.mp3",
      filename: "01 - Hello.mp3",
    });

    const changes = previewTagRule(
      {
        id: 1,
        name: "Track from filename",
        source_field: "filename",
        regex: "^(\\d+)",
        target_field: "track",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].key).toBe("track");
    expect(changes[0].new_value).toBe("01");
  });

  it("should extract artist and title from filename", () => {
    const fileId = seedFile(testDb, libId, {
      path: "/music/Pink Floyd - Comfortably Numb.mp3",
      filename: "Pink Floyd - Comfortably Numb.mp3",
    });

    const changes = previewTagRule(
      {
        id: 2,
        name: "Artist - Title",
        source_field: "filename",
        regex: "^(.+?)\\s*-\\s*(.+?)\\.[^.]+$",
        target_field: "title",
        template: "$2",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].new_value).toBe("Comfortably Numb");
  });

  it("should extract album from folder path", () => {
    const fileId = seedFile(testDb, libId, {
      path: "/music/Dark Side of the Moon/track.mp3",
      filename: "track.mp3",
    });

    const changes = previewTagRule(
      {
        id: 3,
        name: "Album from folder",
        source_field: "folder",
        regex: "([^/\\\\]+)$",
        target_field: "album",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].new_value).toBe("Dark Side of the Moon");
  });

  it("should skip files where regex does not match", () => {
    const fileId = seedFile(testDb, libId, {
      path: "/music/notrack.mp3",
      filename: "notrack.mp3",
    });

    const changes = previewTagRule(
      {
        id: 4,
        name: "Track number",
        source_field: "filename",
        regex: "^(\\d+)",
        target_field: "track",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(0);
  });

  it("should skip files where new value matches existing tag", () => {
    const fileId = seedFile(testDb, libId, {
      path: "/music/01 - Song.mp3",
      filename: "01 - Song.mp3",
    });
    seedTag(testDb, fileId, "track", "01");

    const changes = previewTagRule(
      {
        id: 5,
        name: "Track",
        source_field: "filename",
        regex: "^(\\d+)",
        target_field: "track",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(0);
  });

  it("should handle invalid regex gracefully", () => {
    const fileId = seedFile(testDb, libId);

    const changes = previewTagRule(
      {
        id: 6,
        name: "Bad regex",
        source_field: "filename",
        regex: "[invalid(",
        target_field: "title",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(0);
  });

  it("should use file index as source", () => {
    const file1 = seedFile(testDb, libId, {
      path: "/music/a.mp3",
      filename: "a.mp3",
    });
    const file2 = seedFile(testDb, libId, {
      path: "/music/b.mp3",
      filename: "b.mp3",
    });

    const changes = previewTagRule(
      {
        id: 7,
        name: "Index to track",
        source_field: "index",
        regex: "(\\d+)",
        target_field: "track",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [file1, file2],
    );

    expect(changes).toHaveLength(2);
    expect(changes[0].new_value).toBe("1");
    expect(changes[1].new_value).toBe("2");
  });

  it("should use existing tag as source", () => {
    const fileId = seedFile(testDb, libId, {
      path: "/music/song.mp3",
      filename: "song.mp3",
    });
    seedTag(testDb, fileId, "title", "My Song (Remix)");

    const changes = previewTagRule(
      {
        id: 8,
        name: "Strip remix from title",
        source_field: "tag:title",
        regex: "^(.+?)\\s*\\(",
        target_field: "title",
        template: "$1",
        is_preset: false,
        created_at: "",
      },
      [fileId],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].new_value).toBe("My Song");
  });
});
