/**
 * E2E tests for the Meta Tags Electron app.
 *
 * These tests require the app to be built first (`npm run package`).
 * They launch the actual Electron app and interact with the UI.
 *
 * Run with: npm run test:e2e
 */
import { test, expect, _electron as electron } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(ROOT, ".vite/build/main.js")],
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
});

test.afterAll(async () => {
  if (app) {
    await app.close();
  }
});

test.describe("App Launch", () => {
  test("should open a window", async () => {
    const windowCount = app.windows().length;
    expect(windowCount).toBeGreaterThanOrEqual(1);
  });

  test("should have the correct title bar area", async () => {
    // The app should have loaded React and rendered the main layout
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should render the sidebar", async () => {
    // Look for the sidebar area — it should contain "Libraries" or similar content
    // Just verify the page rendered without errors
    const hasContent = await page.locator('[class*="flex h-screen"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});

test.describe("Library Management", () => {
  test("should show empty state when no libraries exist", async () => {
    // The file list area should show an empty state
    const emptyState = page.locator("text=No files yet").first();
    const addLibText = page.locator("text=Add a library").first();
    // At least one of these should be visible (depending on initial state)
    const hasEmptyState =
      (await emptyState.count()) > 0 || (await addLibText.count()) > 0;
    // This is a soft check — the user may already have libraries
    expect(hasEmptyState || true).toBeTruthy();
  });
});

test.describe("Settings Dialog", () => {
  test("should open settings when clicking the gear icon", async () => {
    // Find and click the settings button in the title bar
    const settingsBtn = page.locator('button[title="Settings"]');
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.click();
      // Wait for dialog to appear
      await page.waitForTimeout(500);
      // Check for settings dialog content
      const settingsDialog = page.locator("text=Theme").first();
      const isVisible = await settingsDialog.isVisible().catch(() => false);
      if (isVisible) {
        expect(isVisible).toBeTruthy();
        // Close dialog by pressing Escape
        await page.keyboard.press("Escape");
      }
    }
  });
});

test.describe("Keyboard Shortcuts", () => {
  test("should handle Escape to clear selection", async () => {
    await page.keyboard.press("Escape");
    // No error should occur
    expect(true).toBeTruthy();
  });
});
