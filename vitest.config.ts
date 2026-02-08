import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/main/**/*.ts", "src/shared/**/*.ts"],
      exclude: ["src/main/ipc/handlers.ts"],
    },
    testTimeout: 10000,
    // Hook scripts to rebuild better-sqlite3 for system Node before tests
    globalSetup: ["tests/helpers/global-setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
