// ESM-only packages that Jest must transpile to CommonJS
const esmOnlyPackages = [
  'commander',
  'ansi-escapes',
  'environment',
  'supports-hyperlinks',
  'has-flag',
  'supports-color',
];
const esmOnlyPackagesPattern = esmOnlyPackages.join('|');

module.exports = {
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
    [`^.+/node_modules/(${esmOnlyPackagesPattern})/.+\\.js$`]: '@swc/jest',
  },
  transformIgnorePatterns: [`/node_modules/(?!(${esmOnlyPackagesPattern})/)`],
  testEnvironment: 'node',
  testTimeout: 10000,
  testPathIgnorePatterns: [
    '.*/__tests__/.*/helpers/.*',
    '.*/__tests__/helpers/.*',
  ],
  reporters: ['default', 'jest-junit'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
