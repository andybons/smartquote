import type { ESLint } from 'eslint';

import smartQuotesRule from './smart-quotes-rule.js';

export { default as smartQuotesRule } from './smart-quotes-rule.js';
export type { SmartQuotesRuleOptions } from './smart-quotes-rule.js';

/**
 * ESLint plugin with the smart-quotes rule.
 *
 * Usage in eslint.config.js:
 * ```js
 * import { plugin as smartQuotesPlugin } from 'smartquote/eslint';
 *
 * export default [
 *   {
 *     plugins: {
 *       smartquote: smartQuotesPlugin,
 *     },
 *     rules: {
 *       'smartquote/smart-quotes': 'error',
 *     },
 *   },
 * ];
 * ```
 */
export const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-smartquote',
    version: '0.1.0',
  },
  rules: {
    'smart-quotes': smartQuotesRule,
  },
};

export default plugin;
