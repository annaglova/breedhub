import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  root: __dirname,
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@ui": path.resolve(__dirname, "../../packages/ui"),
      "@ui/components": path.resolve(__dirname, "../../packages/ui/components"),
      "@shared": path.resolve(__dirname, "../../apps/shared"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../../dist/landing",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
