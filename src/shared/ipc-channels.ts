// IPC channel name constants — shared between main and preload
export const IPC = {
  // Libraries
  GET_LIBRARIES: "db:get-libraries",
  ADD_LIBRARY: "db:add-library",
  REMOVE_LIBRARY: "db:remove-library",
  SELECT_FOLDER: "dialog:select-folder",

  // Scanning
  SCAN_LIBRARY: "scan:library",
  SCAN_PROGRESS: "scan:progress",
  SCAN_COMPLETE: "scan:complete",

  // Files
  GET_FILES: "db:get-files",
  GET_FILES_BY_FOLDER: "db:get-files-by-folder",
  SEARCH_FILES: "db:search-files",

  // Tags
  GET_FILE_TAGS: "db:get-file-tags",
  GET_MULTIPLE_FILE_TAGS: "db:get-multiple-file-tags",

  // Pending Changes
  QUEUE_TAG_CHANGE: "changes:queue",
  QUEUE_BULK_TAG_CHANGES: "changes:queue-bulk",
  GET_PENDING_CHANGES: "changes:get-pending",
  APPLY_PENDING_CHANGES: "changes:apply",
  APPLY_PROGRESS: "changes:apply-progress",
  APPLY_CHANGES_COMPLETE: "changes:apply-complete",
  REJECT_PENDING_CHANGES: "changes:reject",
  CLEAR_PENDING_CHANGES: "changes:clear",

  // Tag History
  GET_TAG_HISTORY: "history:get",
  UNDO_LAST_CHANGE: "history:undo",

  // Tag Rules
  GET_TAG_RULES: "rules:get",
  CREATE_TAG_RULE: "rules:create",
  UPDATE_TAG_RULE: "rules:update",
  DELETE_TAG_RULE: "rules:delete",
  PREVIEW_TAG_RULE: "rules:preview",

  // Folder tree
  GET_FOLDER_TREE: "fs:get-folder-tree",

  // File viewers
  GET_ALBUM_ART: "file:get-album-art",
  SET_ALBUM_ART: "file:set-album-art",
  REMOVE_ALBUM_ART: "file:remove-album-art",
  SELECT_IMAGE_FILE: "dialog:select-image",
  READ_FILE_BASE64: "file:read-base64",

  // Auto-update
  UPDATE_STATUS: "update:status",
  UPDATE_CHECK: "update:check",
  UPDATE_DOWNLOAD: "update:download",
  UPDATE_INSTALL: "update:install",
} as const;
