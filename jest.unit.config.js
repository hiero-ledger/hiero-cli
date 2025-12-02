const base = require('./jest.config');

module.exports = {
  ...base,
  // Match all unit test files
  testMatch: ['**/__tests__/unit/**/*unit.test.ts'],
  testPathIgnorePatterns: [...(base.testPathIgnorePatterns || [])],
  // Optionally tighten timeout for unit tests
  testTimeout: 360000,
};
