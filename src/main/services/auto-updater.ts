import { autoUpdater } from "electron-updater";
import { BrowserWindow } from "electron";
import { IPC } from "../../shared/ipc-channels";

/** Configure and start the auto-updater. Call once after app is ready. */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Don't check for updates in development
  if (process.env.NODE_ENV === "development" || !mainWindow) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    mainWindow.webContents.send(IPC.UPDATE_STATUS, {
      status: "checking",
      message: "Checking for updates…",
    });
  });

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send(IPC.UPDATE_STATUS, {
      status: "available",
      message: `Update ${info.version} is available`,
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send(IPC.UPDATE_STATUS, {
      status: "not-available",
      message: "You are running the latest version",
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send(IPC.UPDATE_STATUS, {
      status: "downloading",
      message: `Downloading: ${Math.round(progress.percent)}%`,
      percent: progress.percent,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow.webContents.send(IPC.UPDATE_STATUS, {
      status: "downloaded",
      message: `Update ${info.version} downloaded. Restart to apply.`,
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send(IPC.UPDATE_STATUS, {
      status: "error",
      message: `Update error: ${err.message}`,
    });
  });

  // Check on launch (with a short delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently ignore — likely offline or no releases configured
    });
  }, 5000);
}

/** Trigger a manual check for updates */
export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
}

/** Download the available update */
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
}

/** Install the downloaded update and restart */
export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
