// ESLint 10 flat config (decision 013): TypeScript + React hooks + fast refresh, plus project guard rails.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// HTTP must go through src/lib/api/client.ts using native fetch (fixed constraint of the project).
const bannedHttpLibs = [
  'axios',
  'ky',
  'node-fetch',
  'cross-fetch',
  'isomorphic-fetch',
  'superagent',
  '@refinedev/simple-rest',
].map((name) => ({ name, message: 'Use the fetch client in src/lib/api instead.' }));

const deepFeatureImport = {
  group: ['@/features/*/*'],
  message: 'Import another feature only through its index: @/features/<name>.',
};

// The dev mock layer (decision 014) is reachable only from src/main.tsx and tests, by alias or by relative path.
const mockImports = [
  {
    group: ['@/mocks', '@/mocks/*', '**/mocks', '**/mocks/*'],
    message: 'Only src/main.tsx and tests may load the dev mock layer.',
  },
  { group: ['msw', 'msw/*'], message: 'MSW belongs to src/mocks and tests.' },
];

const fetchMessage = 'Call the API through src/lib/api/client.ts.';
const fetchProperties = ['window', 'globalThis', 'self'].map((object) => ({
  object,
  property: 'fetch',
  message: fetchMessage,
}));

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'reference',
      'docs',
      'src/mocks/worker',
      'src/lib/api/schema.gen.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        { paths: bannedHttpLibs, patterns: [deepFeatureImport, ...mockImports] },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: fetchMessage }],
      'no-restricted-properties': ['error', ...fetchProperties],
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactRefresh.configs.vite()],
  },
  {
    // Shared layers must not depend on features or on the app (and keep every other ban).
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: bannedHttpLibs,
          patterns: [
            {
              group: ['@/features', '@/features/*', '@/app', '@/app/*'],
              message: 'components/ui and lib must not import features or app.',
            },
            ...mockImports,
          ],
        },
      ],
    },
  },
  {
    // The route table is the one place that may load a feature's pages entry, lazily (one chunk per feature).
    files: ['src/app/routes.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: bannedHttpLibs,
          patterns: [
            { ...deepFeatureImport, group: ['@/features/*/*', '!@/features/*/pages'] },
            ...mockImports,
          ],
        },
      ],
    },
  },
  {
    // The fetch client, the mock layer and tests are allowed to touch fetch.
    files: [
      'src/lib/api/**/*.{ts,tsx}',
      'src/mocks/**/*.{ts,tsx}',
      'src/main.tsx',
      'src/**/*.test.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
    ],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
  {
    // ...and these may load the mock layer and MSW (feature folders still go through feature indexes).
    files: ['src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'src/mocks/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { paths: bannedHttpLibs, patterns: [deepFeatureImport] }] },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
  },
  prettier,
);
