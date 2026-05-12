const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['**/__tests__/unit/**/*.test.ts'],
  testPathIgnorePatterns: [...(base.testPathIgnorePatterns || [])],
  maxWorkers: '75%',
  forceExit: true,
};
