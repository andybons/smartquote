import tseslint from 'typescript-eslint';
import { plugin as smartQuotesPlugin } from 'smartquotes/eslint';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      smartquotes: smartQuotesPlugin,
    },
    rules: {
      // Enable the smart quotes rule
      'smartquotes/smart-quotes': 'error',
      // Disable some TS rules for this example
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
