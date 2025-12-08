/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        diagnostics: {
          warnOnly: true, // Set to true to avoid failing the test suite on TypeScript errors
        },
      },
    ],
  },
  testEnvironment: 'node',
  testTimeout: 40000,
  testPathIgnorePatterns: ['.*/__tests__/helpers/.*'],
  reporters: ['default', 'jest-junit'],
};
