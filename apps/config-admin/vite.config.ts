import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '../../'), // Read .env from monorepo root
  plugins: [react()],
  server: {
    port: 5176, // Unique port for config-admin
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@breedhub/rxdb-store': path.resolve(__dirname, '../../packages/rxdb-store/src'),
      '@breedhub/signal-store': path.resolve(__dirname, '../../packages/signal-store/src'),
      '@breedhub/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  build: {
    outDir: '../../dist/config-admin',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})