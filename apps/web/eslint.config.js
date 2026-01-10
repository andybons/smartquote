import { plugin as smartQuotesPlugin } from 'smartquote/eslint';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      smartquote: smartQuotesPlugin,
    },
    rules: {
      'smartquote/smart-quotes': 'error',
    },
  },
];
