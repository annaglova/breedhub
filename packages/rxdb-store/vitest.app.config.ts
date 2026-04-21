import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../apps/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/app/tests/**/*.test.ts'],
  },
});
