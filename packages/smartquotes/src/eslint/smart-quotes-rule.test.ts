import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from './smart-quotes-rule.js';

describe('smart-quotes', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  });

  // All tests use .tsx filename since rule only applies to JSX/TSX files
  const filename = 'test.tsx';

  describe('JSX text content', () => {
    it('converts double quotes in JSX text', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<p>Click "here" to continue</p>',
            output: '<p>Click \u201Chere\u201D to continue</p>',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts single quotes in JSX text', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: "<p>Click 'here' to continue</p>",
            output: '<p>Click \u2018here\u2019 to continue</p>',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts apostrophes in JSX text', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: "<p>It's working</p>",
            output: '<p>It\u2019s working</p>',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts nested quotes in JSX text', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<p>He said "hello \'friend\'" to me</p>',
            output: '<p>He said \u201Chello \u2018friend\u2019\u201D to me</p>',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts quotes at beginning of JSX text', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<p>"Hello" she said</p>',
            output: '<p>\u201CHello\u201D she said</p>',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts quotes after punctuation in JSX text', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<p>Read the book ("Dune")</p>',
            output: '<p>Read the book (\u201CDune\u201D)</p>',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });
  });

  describe('JSX attributes (allowlisted props only)', () => {
    it('converts apostrophes in placeholder prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<Input placeholder="Enter your partner\'s name" />',
            output: '<Input placeholder="Enter your partner\u2019s name" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts quotes in title prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<div title="It\'s a title" />',
            output: '<div title="It\u2019s a title" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts quotes in alt prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<img alt="A \'beautiful\' sunset" />',
            output: '<img alt="A \u2018beautiful\u2019 sunset" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts quotes in aria-label prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<button aria-label="Open \'Settings\' panel" />',
            output: '<button aria-label="Open \u2018Settings\u2019 panel" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts quotes in label prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<Field label="Partner\'s email" />',
            output: '<Field label="Partner\u2019s email" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts double quotes inside placeholder attribute', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<Input placeholder=\'Say "hello"\' />',
            output: '<Input placeholder="Say \\\u201Chello\\\u201D" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts double quotes inside aria-label attribute', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<button aria-label=\'Click "Submit" button\' />',
            output: '<button aria-label="Click \\\u201CSubmit\\\u201D button" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });

    it('converts double quotes inside title attribute', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<div title=\'The "best" option\' />',
            output: '<div title="The \\\u201Cbest\\\u201D option" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
          },
        ],
      });
    });
  });

  describe('non-allowlisted props are ignored', () => {
    it('ignores className prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<div className="foo\'bar" />', filename }],
        invalid: [],
      });
    });

    it('ignores href prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<a href="/path?q=\'test\'" />', filename }],
        invalid: [],
      });
    });

    it('ignores to prop (router links)', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<Link to="/dashboard?ref=\'home\'" />', filename }],
        invalid: [],
      });
    });

    it('ignores data-testid prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<div data-testid="test\'id" />', filename }],
        invalid: [],
      });
    });

    it('ignores key prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<div key="item\'1" />', filename }],
        invalid: [],
      });
    });

    it('ignores id prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<div id="my\'id" />', filename }],
        invalid: [],
      });
    });

    it('ignores name prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<input name="field\'name" />', filename }],
        invalid: [],
      });
    });

    it('ignores type prop', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<input type="text" />', filename }],
        invalid: [],
      });
    });

    it('ignores custom props', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<Component customProp="don\'t convert" />', filename }],
        invalid: [],
      });
    });
  });

  describe('string literals outside JSX are ignored', () => {
    it('ignores regular string literals', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: 'const msg = "Don\'t worry";', filename },
          { code: 'const msg = "Click \\"here\\"";', filename },
        ],
        invalid: [],
      });
    });

    it('ignores template literals', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: "const msg = `It's great`;", filename },
          { code: 'const msg = `Welcome to "Neptune"`;', filename },
        ],
        invalid: [],
      });
    });

    it('ignores string comparisons', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: "if (token.startsWith('<span class=\"')) {}", filename },
          { code: "if (str.endsWith('\"')) {}", filename },
          { code: 'if (text.includes("don\'t")) {}', filename },
        ],
        invalid: [],
      });
    });

    it('ignores import statements', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: "import { foo } from 'bar';", filename },
          { code: 'import { foo } from "@acme/ui";', filename },
        ],
        invalid: [],
      });
    });

    it('ignores object property keys', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: 'const obj = { "key\'s": value };', filename },
          { code: "const obj = { 'key-name': value };", filename },
        ],
        invalid: [],
      });
    });
  });

  describe('skips non-JSX files', () => {
    it('skips .ts files entirely', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: '<p>Click "here"</p>', filename: 'test.ts' },
          { code: '<Input placeholder="Don\'t worry" />', filename: 'test.ts' },
        ],
        invalid: [],
      });
    });

    it('skips .js files entirely', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<p>Click "here"</p>', filename: 'test.js' }],
        invalid: [],
      });
    });
  });

  describe('already smart quotes (no-op)', () => {
    it('ignores JSX text with smart quotes', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: '<p>Click \u201Chere\u201D to continue</p>', filename },
          { code: '<p>It\u2019s working</p>', filename },
        ],
        invalid: [],
      });
    });

    it('ignores props with smart quotes', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [{ code: '<Input placeholder="Partner\u2019s name" />', filename }],
        invalid: [],
      });
    });
  });

  describe('no quotes (no-op)', () => {
    it('ignores text without quotes', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          { code: '<p>Hello world</p>', filename },
          { code: '<Input placeholder="Enter name" />', filename },
        ],
        invalid: [],
      });
    });
  });

  describe('custom options', () => {
    it('additionalProps extends defaults', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [],
        invalid: [
          {
            code: '<Component message="It\'s custom" />',
            output: '<Component message="It\u2019s custom" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
            options: [{ additionalProps: ['message'] }],
          },
        ],
      });
    });

    it('props overrides defaults', () => {
      ruleTester.run('smart-quotes', rule, {
        valid: [
          // placeholder is in defaults but not in our override
          { code: '<Input placeholder="It\'s ignored" />', filename, options: [{ props: ['custom'] }] },
        ],
        invalid: [
          {
            code: '<Component custom="It\'s checked" />',
            output: '<Component custom="It\u2019s checked" />',
            errors: [{ messageId: 'straightQuotes' }],
            filename,
            options: [{ props: ['custom'] }],
          },
        ],
      });
    });
  });
});
