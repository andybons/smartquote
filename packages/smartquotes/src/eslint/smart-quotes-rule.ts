import type { Rule } from 'eslint';
import type { Literal, Node } from 'estree';

import { smartQuotes, SmartQuote } from '../index.js';

function hasStraightQuotes(text: string): boolean {
  return text.includes(SmartQuote.StraightDouble) || text.includes(SmartQuote.StraightSingle);
}

// JSX props that contain user-facing text (allowlist approach)
// Only these props will have smart quote conversion applied
const DEFAULT_USER_FACING_PROPS = new Set([
  // Text content props
  'placeholder',
  'title',
  'alt',
  'label',
  // ARIA labels (user-facing for accessibility)
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
]);

// JSX-specific types (not in estree, but available at runtime)
interface JSXText {
  type: 'JSXText';
  value: string;
  raw: string;
  range?: [number, number];
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface JSXIdentifier {
  type: 'JSXIdentifier';
  name: string;
}

interface JSXNamespacedName {
  type: 'JSXNamespacedName';
  namespace: JSXIdentifier;
  name: JSXIdentifier;
}

interface JSXAttribute {
  type: 'JSXAttribute';
  name: JSXIdentifier | JSXNamespacedName;
  value: Literal | null;
}

function getJSXAttributeName(name: JSXIdentifier | JSXNamespacedName): string {
  return name.type === 'JSXIdentifier'
    ? name.name
    : `${name.namespace.name}:${name.name.name}`;
}

export interface SmartQuotesRuleOptions {
  /**
   * Additional props to check for smart quotes (merged with defaults)
   */
  additionalProps?: string[];
  /**
   * Override the default props entirely
   */
  props?: string[];
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce typographically correct smart quotes in user-facing text',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      straightQuotes:
        'Use smart quotes (\u201C\u201D \u2018\u2019) instead of straight quotes (" \')',
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalProps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional props to check (merged with defaults)',
          },
          props: {
            type: 'array',
            items: { type: 'string' },
            description: 'Override the default props entirely',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();

    // Only apply to JSX/TSX files
    if (!filename.endsWith('.tsx') && !filename.endsWith('.jsx')) {
      return {};
    }

    // Build the props set from options
    const options = (context.options[0] ?? {}) as SmartQuotesRuleOptions;
    const userFacingProps = options.props
      ? new Set(options.props)
      : new Set([...DEFAULT_USER_FACING_PROPS, ...(options.additionalProps ?? [])]);

    return {
      // Handle JSX text content: <p>Click "here"</p>
      // This is always user-facing text
      JSXText(node: Node) {
        // Type assertion needed: ESLint's estree types don't include JSX nodes
        const jsxText = node as unknown as JSXText;
        const text = jsxText.value;
        if (!hasStraightQuotes(text)) return;

        const converted = smartQuotes(text);

        context.report({
          node,
          messageId: 'straightQuotes',
          fix(fixer) {
            return fixer.replaceText(node, converted);
          },
        });
      },

      // Handle JSX attribute strings - only allowlisted props
      // e.g., <Input placeholder="Enter partner's name" />
      JSXAttribute(node: Node) {
        // Type assertion needed: ESLint's estree types don't include JSX nodes
        const jsxAttr = node as unknown as JSXAttribute;

        // Only process string literal values
        if (!jsxAttr.value || jsxAttr.value.type !== 'Literal') return;
        const literal = jsxAttr.value;
        if (typeof literal.value !== 'string') return;

        // Only convert allowlisted user-facing props
        const propName = getJSXAttributeName(jsxAttr.name);
        if (!userFacingProps.has(propName)) return;

        const text = literal.value;
        if (!hasStraightQuotes(text)) return;

        const converted = smartQuotes(text);

        context.report({
          node: literal,
          messageId: 'straightQuotes',
          fix(fixer) {
            // JSX attributes use double quotes, escape smart double quotes for JSX
            const escaped = converted.replace(
              new RegExp(`[${SmartQuote.LeftDouble}${SmartQuote.RightDouble}]`, 'g'),
              (match) => `\\${match}`,
            );
            return fixer.replaceText(literal, `"${escaped}"`);
          },
        });
      },
    };
  },
};

export default rule;
