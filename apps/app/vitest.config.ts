import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: path.resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@ui": path.resolve(__dirname, "../../packages/ui"),
      "@ui/components": path.resolve(__dirname, "../../packages/ui/components"),
      "@shared": path.resolve(__dirname, "../../apps/shared"),
      "@breedhub/rxdb-store": path.resolve(__dirname, "../../packages/rxdb-store/src"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["apps/app/tests/setup.ts"],
    include: [
      "apps/app/tests/**/*.test.ts",
      "apps/app/tests/**/*.test.tsx",
    ],
  },
});
