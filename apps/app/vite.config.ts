import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./", // apps/app/ буде root
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"), // імпорт через @ працюватиме у коді
    },
  },
  build: {
    outDir: "../../dist/app", // відносно apps/app/
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: true,
  },
});
