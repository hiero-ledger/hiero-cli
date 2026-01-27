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
    '^.+\\.js$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        useESM: true,
      },
    ],
  },
  testEnvironment: 'node',
  testTimeout: 40000,
  testPathIgnorePatterns: ['.*/__tests__/helpers/.*'],
  transformIgnorePatterns: [
    'node_modules/(?!(ansi-escapes|supports-hyperlinks|environment|supports-color|has-flag)/)',
  ],
  reporters: ['default', 'jest-junit'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
