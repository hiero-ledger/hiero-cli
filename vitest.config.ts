import { defineConfig } from 'vitest/config';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'examples/**',
      'src/**/types.ts',
      'src/**/index.ts',
      'src/**/*.d.ts',
    ],
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: path.resolve(__dirname, 'coverage'),
      reporter: ['text', 'html'],
      enabled: false,
    },
    testTimeout: 120000,
    hookTimeout: 120000,
    // Retry configuration for e2e tests
    retry: 3, // Only retry in CI/production, not during development
  },
});
