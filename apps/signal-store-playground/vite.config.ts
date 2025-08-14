import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@breedhub/signal-store': path.resolve(__dirname, '../../packages/signal-store/src/index.ts'),
    },
  },
  build: {
    outDir: '../../dist/signal-store-playground',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: true,
  },
});