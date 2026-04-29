import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      '**/dist/**',
      '**/dev-dist/**',
      'test-results/**',
      '**/*.d.ts',
      'apps/**/src/**/*.js',
      'packages/**/*.js',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // CACHE_AUDIT P10 / W9 — new code must use getChildField from
      // @breedhub/rxdb-store instead of inlining
      // `record.additional?.[name]` / `record.additional?.name`. The
      // helper centralises the schema-vs-additional split (see
      // packages/rxdb-store/src/stores/space-child.helpers.ts) so a
      // future storage change touches one place. Existing call sites
      // are tracked for migration in
      // breedhub-docs/frontend/app/data/CACHE_TESTS_TODO.md.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "MemberExpression[property.name='additional'][parent.type='ChainExpression'], MemberExpression[property.name='additional'][optional=true]",
          message:
            "Don't read `.additional?.X` directly — use getChildField(record, 'X') from @breedhub/rxdb-store instead. See CACHE_AUDIT_2026_04_28.md (W9 / P10).",
        },
      ],
    },
  },
)
