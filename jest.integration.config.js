const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [...(base.testPathIgnorePatterns || [])],
  testTimeout: 120000,
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  globalSetup: '<rootDir>/jest.integration.global.setup.ts',
  globalTeardown: '<rootDir>/jest.integration.global.teardown.ts',
};
