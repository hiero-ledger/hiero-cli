module.exports = {
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  testEnvironment: 'node',
  testTimeout: 10000,
  testPathIgnorePatterns: ['.*/__tests__/helpers/.*'],
  reporters: ['default', 'jest-junit'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
