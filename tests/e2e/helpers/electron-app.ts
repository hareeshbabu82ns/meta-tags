/**
 * Electron E2E test helper — launches the packaged Electron app
 * using Playwright's Electron support.
 */
import { _electron as electron } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Launch the Electron app for E2E testing.
 * Uses `electron-forge start`-style launch via the main entry.
 */
export async function launchApp(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  const app = await electron.launch({
    args: [path.join(ROOT, ".vite/build/main.js")],
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });

  // Wait for the first BrowserWindow to open
  const page = await app.firstWindow();
  // Wait for the app to finish initial rendering
  await page.waitForLoadState("domcontentloaded");
  // Small delay for React to hydrate
  await page.waitForTimeout(1000);

  return { app, page };
}

/**
 * Close the Electron app cleanly.
 */
export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
}
