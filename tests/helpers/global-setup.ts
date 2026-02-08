/**
 * Vitest global setup — rebuilds better-sqlite3 for system Node
 * before tests run, and rebuilds for Electron after tests complete.
 */
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const BS3_DIR = path.join(ROOT, "node_modules/better-sqlite3");

export async function setup(): Promise<void> {
  console.log("\n🔧 Rebuilding better-sqlite3 for system Node...");
  try {
    execSync("npm rebuild better-sqlite3", {
      cwd: ROOT,
      stdio: "pipe",
    });
    console.log("✅ better-sqlite3 rebuilt for system Node\n");
  } catch (err) {
    console.error("⚠️  Failed to rebuild better-sqlite3 for system Node:", err);
  }
}

export async function teardown(): Promise<void> {
  console.log("\n🔧 Rebuilding better-sqlite3 for Electron...");
  try {
    execSync("npx @electron/rebuild --module better-sqlite3 --force", {
      cwd: ROOT,
      stdio: "pipe",
    });
    console.log("✅ better-sqlite3 rebuilt for Electron\n");
  } catch (err) {
    console.error("⚠️  Failed to rebuild better-sqlite3 for Electron:", err);
  }
}
