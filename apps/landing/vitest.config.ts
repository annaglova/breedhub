import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  root: path.resolve(__dirname, "../.."),
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@ui": path.resolve(__dirname, "../../packages/ui"),
      "@ui/components": path.resolve(__dirname, "../../packages/ui/components"),
      "@shared": path.resolve(__dirname, "../../apps/shared"),
      "@breedhub/rxdb-store": path.resolve(
        __dirname,
        "../../packages/rxdb-store/src",
      ),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["apps/landing/tests/setup.ts"],
    include: [
      "apps/landing/tests/**/*.test.ts",
      "apps/landing/tests/**/*.test.tsx",
    ],
  },
});
