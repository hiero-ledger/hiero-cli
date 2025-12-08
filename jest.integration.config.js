const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [...(base.testPathIgnorePatterns || [])],
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  globalTeardown: '<rootDir>/jest.integration.global.teardown.ts',
};
