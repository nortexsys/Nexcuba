import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Service-role client must never be imported outside server-only modules.
    // See design.md §10 and scripts/check-secrets-usage.mjs (CI belt-and-braces).
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Underscore-prefixed identifiers mark intentionally unused bindings.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/server/*', '@/lib/server/*'],
              message:
                'Server-only module. Service-role access is restricted to src/lib/server/** and server actions/route handlers.',
            },
          ],
        },
      ],
    },
  },
  {
    // The server-only modules themselves may import their siblings.
    files: ['src/lib/server/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Server actions ('use server') may use the server-only modules: Next
    // replaces their imports with RPC references, never bundling them client-
    // side. scripts/check-secrets-usage.mjs still greps for raw key names.
    files: ['src/app/**/actions.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts', 'scripts/**/*.mjs', '**/*.test.{ts,tsx}', '**/*.test-d.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
];

export default eslintConfig;
