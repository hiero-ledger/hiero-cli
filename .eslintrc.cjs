/**
 * Workaround for eslint-plugin-import rule `import/no-unused-modules`: with ESLint flat config its
 * file scan still relies on legacy config discovery (FileEnumerator). A minimal `.eslintrc.*` lets
 * that path succeed even though every real rule lives in eslint.config.js. Safe to delete if you
 * drop `import/no-unused-modules`.
 * @see https://github.com/import-js/eslint-plugin-import/issues/3079
 */
module.exports = {
  root: true,
  ignorePatterns: [],
};
