import { defineConfig } from 'vitest/config';

// RLS test suite: tests share fixtures created once in beforeAll (one org,
// four users, one game/channel/message), so they must run sequentially
// in a single worker — parallel execution would race on shared rows.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    poolOptions: {
      threads: {
        singleThread: true,
      },
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
