import { defineConfig } from "vite";
import path from "node:path";

// https://vitejs.dev/config
// Use async config to dynamically import ESM-only plugins
export default defineConfig(async () => {
  const react = (await import("@vitejs/plugin-react")).default;
  const tailwindcss = (await import("@tailwindcss/vite")).default;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
