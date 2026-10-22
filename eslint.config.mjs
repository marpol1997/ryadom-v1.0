import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const ignores = [
  'node_modules/**',
  '.next/**',
  'next-env.d.ts',
  'legacy-v1/**',
  'public/uploads/**'
];

export default [
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.{mjs,ts}'],
    languageOptions: { globals: globals.node }
  }
];
