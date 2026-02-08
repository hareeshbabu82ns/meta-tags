import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "./shared/ipc-channels";
import type {
  ElectronAPI,
  PendingChange,
  TagRule,
  ScanProgress,
  UpdateStatus,
} from "./shared/types";

const api: ElectronAPI = {
  // Libraries
  getLibraries: () => ipcRenderer.invoke(IPC.GET_LIBRARIES),
  addLibrary: (path, name) => ipcRenderer.invoke(IPC.ADD_LIBRARY, path, name),
  removeLibrary: (id) => ipcRenderer.invoke(IPC.REMOVE_LIBRARY, id),
  selectFolder: () => ipcRenderer.invoke(IPC.SELECT_FOLDER),

  // Scanning
  scanLibrary: (id) => ipcRenderer.invoke(IPC.SCAN_LIBRARY, id),
  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: ScanProgress,
    ) => callback(progress);
    ipcRenderer.on(IPC.SCAN_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.SCAN_PROGRESS, handler);
  },
  onScanComplete: (callback: (libraryId: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, libraryId: number) =>
      callback(libraryId);
    ipcRenderer.on(IPC.SCAN_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC.SCAN_COMPLETE, handler);
  },

  // Files
  getFiles: (libraryId) => ipcRenderer.invoke(IPC.GET_FILES, libraryId),
  getFilesByFolder: (folderPath) =>
    ipcRenderer.invoke(IPC.GET_FILES_BY_FOLDER, folderPath),
  searchFiles: (query) => ipcRenderer.invoke(IPC.SEARCH_FILES, query),

  // Tags
  getFileTags: (fileId) => ipcRenderer.invoke(IPC.GET_FILE_TAGS, fileId),
  getMultipleFileTags: (fileIds) =>
    ipcRenderer.invoke(IPC.GET_MULTIPLE_FILE_TAGS, fileIds),

  // Pending Changes
  queueTagChange: (change) => ipcRenderer.invoke(IPC.QUEUE_TAG_CHANGE, change),
  queueBulkTagChanges: (changes) =>
    ipcRenderer.invoke(IPC.QUEUE_BULK_TAG_CHANGES, changes),
  getPendingChanges: () => ipcRenderer.invoke(IPC.GET_PENDING_CHANGES),
  applyPendingChanges: (ids) =>
    ipcRenderer.invoke(IPC.APPLY_PENDING_CHANGES, ids),
  rejectPendingChanges: (ids) =>
    ipcRenderer.invoke(IPC.REJECT_PENDING_CHANGES, ids),
  clearPendingChanges: () => ipcRenderer.invoke(IPC.CLEAR_PENDING_CHANGES),

  // Tag History
  getTagHistory: (fileId) => ipcRenderer.invoke(IPC.GET_TAG_HISTORY, fileId),
  undoLastChange: (fileId) => ipcRenderer.invoke(IPC.UNDO_LAST_CHANGE, fileId),

  // Tag Rules
  getTagRules: () => ipcRenderer.invoke(IPC.GET_TAG_RULES),
  createTagRule: (rule) => ipcRenderer.invoke(IPC.CREATE_TAG_RULE, rule),
  updateTagRule: (rule) => ipcRenderer.invoke(IPC.UPDATE_TAG_RULE, rule),
  deleteTagRule: (id) => ipcRenderer.invoke(IPC.DELETE_TAG_RULE, id),
  previewTagRule: (ruleId, fileIds) =>
    ipcRenderer.invoke(IPC.PREVIEW_TAG_RULE, ruleId, fileIds),

  // File streaming
  getStreamUrl: (filePath: string) => `media://file${encodeURI(filePath)}`,

  // File viewers
  getAlbumArt: (filePath) => ipcRenderer.invoke(IPC.GET_ALBUM_ART, filePath),
  setAlbumArt: (filePath, imagePath) =>
    ipcRenderer.invoke(IPC.SET_ALBUM_ART, filePath, imagePath),
  removeAlbumArt: (filePath) =>
    ipcRenderer.invoke(IPC.REMOVE_ALBUM_ART, filePath),
  selectImageFile: () => ipcRenderer.invoke(IPC.SELECT_IMAGE_FILE),
  readFileAsBase64: (filePath) =>
    ipcRenderer.invoke(IPC.READ_FILE_BASE64, filePath),

  // Folder tree
  getFolderTree: (libraryId) =>
    ipcRenderer.invoke(IPC.GET_FOLDER_TREE, libraryId),

  // Auto-update
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: UpdateStatus) =>
      callback(status);
    ipcRenderer.on(IPC.UPDATE_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC.UPDATE_STATUS, handler);
  },
  checkForUpdate: () => ipcRenderer.invoke(IPC.UPDATE_CHECK),
  downloadUpdate: () => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD),
  installUpdate: () => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
};

contextBridge.exposeInMainWorld("electronAPI", api);
