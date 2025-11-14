const base = require('./jest.config');

module.exports = {
  ...base,
  // Match all unit test files
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [...(base.testPathIgnorePatterns || [])],
  // Optionally tighten timeout for unit tests
  testTimeout: 20000,
};
