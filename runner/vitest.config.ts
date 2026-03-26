import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: false,
  test: {
    globals: true,
    environment: 'node',
    // Only include test files within this runner directory
    include: ['src/**/*.test.ts'],
  },
});
