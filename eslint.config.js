const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const noRelativeImportPaths = require('eslint-plugin-no-relative-import-paths');
const importPlugin = require('eslint-plugin-import');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/__mocks__/**',
      'hardhat.config.js',
      'jest.config.js',
      'jest.*.config.js',
      'jest.integration.setup.js',
      'jest.integration.global.teardown.ts',
      'src/__tests__/mocks/plugin-mock/test',
    ],
  },

  // Base TypeScript config
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
      ecmaVersion: 2023,
      globals: {
        ...globals.node,
        ...globals.es2021,
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSort,
      'no-relative-import-paths': noRelativeImportPaths,
      import: importPlugin,
      prettier: prettier,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-type-checked'].rules,
      ...prettierConfig.rules,

      // Project overrides
      'no-console': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-restricted-syntax': 'off',

      // Import sorting
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            [
              '^node:.*\\u0000$',
              '^@?\\w.*\\u0000$',
              '^@/.*\\u0000$',
              '^\\.\\..*\\u0000$',
              '^\\..*\\u0000$',
            ],
            ['^\\u0000'],
            ['^node:'],
            ['^@?\\w'],
            ['^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./', '^\\./'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import/no-duplicates': 'error',

      // Type imports/exports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',

      // Path aliases
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: true, rootDir: 'src', prefix: '@' },
      ],

      'prettier/prettier': 'error',
    },
  },

  // Test files - relax type safety
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: './tsconfig.test.json' },
      globals: globals.jest,
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // Command handlers - allow sync handlers
  {
    files: ['src/plugins/**/commands/**/handler.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Jest config files - allow require()
  {
    files: ['jest.config.js', 'jest.*.config.js'],
    languageOptions: {
      globals: { ...globals.node, module: 'writable' },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
