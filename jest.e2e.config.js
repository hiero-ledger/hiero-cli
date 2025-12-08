const base = require('./jest.config');

module.exports = {
  ...base,
  // Run any e2e*.test.ts so we can have a minimal and a full suite
  testMatch: ['**/__tests__/e2e*.test.ts'],
  // Increase timeout for slower network / integration steps
  testTimeout: 90000,
  // E2E often needs runInBand to avoid shared state/race conditions
  maxWorkers: 1,
};
