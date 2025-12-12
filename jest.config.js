/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        diagnostics: {
          warnOnly: false,
        },
      },
    ],
  },
  testEnvironment: 'node',
  testTimeout: 40000,
  testPathIgnorePatterns: ['.*/__tests__/helpers/.*'],
  reporters: ['default', 'jest-junit'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
