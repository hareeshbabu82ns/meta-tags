import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["better-sqlite3", "electron-updater"],
    },
  },
  resolve: {
    // Some music-metadata deps need this
    mainFields: ["module", "jsnext:main", "jsnext"],
  },
});
