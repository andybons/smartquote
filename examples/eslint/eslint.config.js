import tseslint from 'typescript-eslint';
import { plugin as smartQuotesPlugin } from 'smartquote/eslint';

export default [
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      smartquote: smartQuotesPlugin,
    },
    rules: {
      // Enable the smart quotes rule
      'smartquote/smart-quotes': 'error',
      // Disable some TS rules for this example
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
