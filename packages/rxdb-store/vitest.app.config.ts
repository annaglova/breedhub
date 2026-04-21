import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../apps/app/src'),
      '@shared': path.resolve(__dirname, '../../apps/shared'),
      '@ui': path.resolve(__dirname, '../../packages/ui'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'apps/app/tests/**/*.test.ts',
      'apps/app/tests/**/*.test.tsx',
    ],
  },
});
