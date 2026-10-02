import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts'],
    // Tests share one local database; run files one at a time.
    fileParallelism: false,
    // An empty prefix loads every variable from .env.test, not just VITE_*.
    env: loadEnv(mode, process.cwd(), ''),
  },
}));
