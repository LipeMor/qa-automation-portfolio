// @ts-check
// Este arquivo roda direto no Node como CommonJS (sem transpilação) — por isso usa require() em
// vez de import, mesmo com as regras abaixo geralmente preferindo import. As duas regras abaixo
// só são desligadas aqui, para este arquivo específico.
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const playwright = require('eslint-plugin-playwright');

module.exports = tseslint.config(
  {
    ignores: ['.sut/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    // game/game.js roda direto no browser, sem build step (Fase 4) — por isso não está em
    // tsconfig.json "include" nem é transpilado. Precisa dos globals de browser (não Node) pra não
    // acusar window/document como não definidos.
    files: ['game/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },
);
