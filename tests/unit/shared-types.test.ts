/**
 * Tests for shared utility functions and type helpers.
 */
import { describe, it, expect } from "vitest";
import {
  getFileCategory,
  getFileType,
  SUPPORTED_EXTENSIONS,
  COMMON_TAG_FIELDS,
  COMMON_ATTRIBUTES_BY_TYPE,
} from "../../src/shared/types";

describe("Shared Types", () => {
  describe("getFileCategory", () => {
    it("should classify audio files", () => {
      expect(getFileCategory("mp3")).toBe("audio");
      expect(getFileCategory("flac")).toBe("audio");
      expect(getFileCategory("ogg")).toBe("audio");
      expect(getFileCategory("wav")).toBe("audio");
    });

    it("should classify document files", () => {
      expect(getFileCategory("pdf")).toBe("document");
      expect(getFileCategory("epub")).toBe("document");
    });
  });

  describe("getFileType", () => {
    it("should extract file type from filename", () => {
      expect(getFileType("song.mp3")).toBe("mp3");
      expect(getFileType("track.flac")).toBe("flac");
      expect(getFileType("book.pdf")).toBe("pdf");
      expect(getFileType("novel.epub")).toBe("epub");
    });

    it("should handle uppercase extensions", () => {
      expect(getFileType("song.MP3")).toBe("mp3");
      expect(getFileType("book.PDF")).toBe("pdf");
    });

    it("should return null for unsupported types", () => {
      expect(getFileType("image.png")).toBeNull();
      expect(getFileType("video.mp4")).toBeNull();
      expect(getFileType("noextension")).toBeNull();
    });

    it("should handle filenames with multiple dots", () => {
      expect(getFileType("my.song.name.mp3")).toBe("mp3");
    });
  });

  describe("SUPPORTED_EXTENSIONS", () => {
    it("should include all supported file extensions", () => {
      expect(SUPPORTED_EXTENSIONS).toContain(".mp3");
      expect(SUPPORTED_EXTENSIONS).toContain(".flac");
      expect(SUPPORTED_EXTENSIONS).toContain(".ogg");
      expect(SUPPORTED_EXTENSIONS).toContain(".wav");
      expect(SUPPORTED_EXTENSIONS).toContain(".pdf");
      expect(SUPPORTED_EXTENSIONS).toContain(".epub");
    });
  });

  describe("COMMON_TAG_FIELDS", () => {
    it("should contain essential tag field names", () => {
      expect(COMMON_TAG_FIELDS).toContain("title");
      expect(COMMON_TAG_FIELDS).toContain("artist");
      expect(COMMON_TAG_FIELDS).toContain("album");
      expect(COMMON_TAG_FIELDS).toContain("genre");
      expect(COMMON_TAG_FIELDS).toContain("year");
    });
  });

  describe("COMMON_ATTRIBUTES_BY_TYPE", () => {
    it("should have attributes for all file types", () => {
      expect(COMMON_ATTRIBUTES_BY_TYPE.mp3.length).toBeGreaterThan(0);
      expect(COMMON_ATTRIBUTES_BY_TYPE.pdf.length).toBeGreaterThan(0);
      expect(COMMON_ATTRIBUTES_BY_TYPE.epub.length).toBeGreaterThan(0);
    });

    it("should include title for all types", () => {
      for (const type of Object.keys(COMMON_ATTRIBUTES_BY_TYPE)) {
        expect(
          COMMON_ATTRIBUTES_BY_TYPE[
            type as keyof typeof COMMON_ATTRIBUTES_BY_TYPE
          ],
        ).toContain("title");
      }
    });

    it("should have artist for audio, author for documents", () => {
      expect(COMMON_ATTRIBUTES_BY_TYPE.mp3).toContain("artist");
      expect(COMMON_ATTRIBUTES_BY_TYPE.pdf).toContain("author");
      expect(COMMON_ATTRIBUTES_BY_TYPE.epub).toContain("author");
    });
  });
});
