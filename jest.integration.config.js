// Load `.env.test` before jest imports any harness module: `network.config`
// freezes `process.env` at import time, and `globalSetup`/`globalTeardown`
// import `@/core` before their own `dotenv.config()` would run. Workers are
// forked afterwards and inherit this environment.
require('dotenv').config({ path: '.env.test', quiet: true });

const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    ...(base.testPathIgnorePatterns || []),
    // Unit tests for the shared test utils live under `src/__tests__/unit/`
    // and would otherwise be collected (and counted) as integration tests.
    '.*/src/__tests__/unit/.*',
  ],
  // Measured on localnet the slowest test takes ~18s; the longer suites
  // (transfer-nft, topic-messages) raise it to 60s where they need to.
  testTimeout: 30000,
  globalSetup: '<rootDir>/jest.integration.global.setup.ts',
  globalTeardown: '<rootDir>/jest.integration.global.teardown.ts',
};
