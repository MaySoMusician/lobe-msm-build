import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const lintedFiles = ['scripts/**/*.mjs', 'lobe-chat-tests/playwright/**/*.ts'];

// Unspecified block kinds inherit `consistent`, which keeps function and object
// braces as they are. Naming only the control-flow keys without that default
// makes the rule collapse every other block onto one line.
const controlFlowNewlines = {
  consistent: true,
  minElements: Number.POSITIVE_INFINITY,
  multiline: false,
  DoWhileStatement: 'always',
  ForInStatement: 'always',
  ForOfStatement: 'always',
  ForStatement: 'always',
  IfStatementAlternative: 'always',
  IfStatementConsequent: 'always',
  WhileStatement: 'always',
};

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '.artifacts/**',
      '.pnpm-store/**',
      '**/*.patch',
      'eslint.config.mjs',
      'prettier.config.mjs',
      'lobe-chat-tests/**/*.msm.test.ts',
      'lobe-chat-tests/**/*.msm.test.tsx',
      'lobe-chat-tests/playwright/pnpm-lock.yaml',
      'lobe-chat-tests/playwright/playwright-report/**',
      'lobe-chat-tests/playwright/test-results/**',
      'lobe-chat-tests/playwright/.auth/**',
    ],
  },
  {
    files: ['scripts/**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
  {
    files: ['lobe-chat-tests/playwright/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parser: tseslint.parser,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Core rules do not understand TypeScript types or parameter properties.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  eslintConfigPrettier,
  {
    files: lintedFiles,
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      curly: ['error', 'all'],
      '@stylistic/curly-newline': ['error', controlFlowNewlines],
    },
  },
);
