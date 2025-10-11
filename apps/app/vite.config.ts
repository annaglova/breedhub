import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '../../'), // Read .env from monorepo root
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@ui": path.resolve(__dirname, "../../packages/ui"),
      "@ui/components": path.resolve(__dirname, "../../packages/ui/components"),
      "@shared": path.resolve(__dirname, "../../apps/shared"),
      "@breedhub/rxdb-store": path.resolve(__dirname, "../../packages/rxdb-store/src"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../../dist/app",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api': {
        target: 'https://dev.dogarray.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
});
