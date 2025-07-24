/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'examples/',
        'vitest.config.ts'
      ]
    },
    testTimeout: 30000, // 30 seconds for API tests
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
}); 