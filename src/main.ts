import { app, BrowserWindow, protocol, net } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import started from "electron-squirrel-startup";
import { registerIpcHandlers } from "./main/ipc/handlers";
import { closeDb } from "./main/db/database";
import { initAutoUpdater } from "./main/services/auto-updater";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Register custom protocol scheme for streaming local files
protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

app.on("ready", () => {
  // Register media:// protocol for streaming local files
  protocol.handle("media", (request) => {
    // URL format: media://file/<encoded-path>
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);
    // Remove leading slash on macOS paths that already start with /
    const cleanPath = filePath.startsWith("//")
      ? filePath.substring(1)
      : filePath;
    return net.fetch(pathToFileURL(cleanPath).toString());
  });

  // Register all IPC handlers
  registerIpcHandlers();

  createWindow();

  // Start auto-updater after window is created
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    initAutoUpdater(win);
  }
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDb();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  closeDb();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
