# smartquotes

Smart quote conversion utilities and ESLint plugin for typographically correct quotes.

Converts straight quotes (`"` and `'`) to their curly/smart equivalents (`\u201C` `\u201D` `\u2018` `\u2019`).

## Installation

```bash
npm install smartquotes
# or
pnpm add smartquotes
```

## Quick Start

```typescript
import { convertToSmartQuotes, QUOTES } from 'smartquotes';

const result = convertToSmartQuotes('She said "hello"');
// result === 'She said \u201Chello\u201D'

// Verify with constants
result.startsWith(`She said ${QUOTES.LEFT_DOUBLE}`); // true
```

## API Reference

### `convertToSmartQuotes(text: string): string`

Converts straight quotes to smart quotes using context-aware rules.

```typescript
import { convertToSmartQuotes, QUOTES } from 'smartquotes';
const { LEFT_DOUBLE, RIGHT_DOUBLE, RIGHT_SINGLE } = QUOTES;

// Basic conversion
convertToSmartQuotes('"hello"');
// === `${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`

// Apostrophes are detected between letters
convertToSmartQuotes("It's wonderful");
// === `It${RIGHT_SINGLE}s wonderful`

// Nested quotes work correctly
convertToSmartQuotes(`He said "She told me 'yes'"`);
// Outer double quotes, inner single quotes
```

### `smartQuoteMarkdown(text: string): string`

Markdown-aware conversion that preserves straight quotes inside code blocks.

```typescript
import { smartQuoteMarkdown } from 'smartquotes';

const markdown = `
"This quote converts," she said.

\`\`\`javascript
const x = "stays straight";
\`\`\`

Use \`"straight"\` in inline code.
`;

const result = smartQuoteMarkdown(markdown);
// Prose gets smart quotes; code blocks are unchanged
```

**Preserved regions:**
- Fenced code blocks (` ``` `)
- Inline code (`` ` ``)
- Indented code blocks (4 spaces or tab)

### `QUOTES`

Constants using Unicode escapes (immune to LLM normalization):

```typescript
import { QUOTES } from 'smartquotes';

QUOTES.LEFT_DOUBLE     // \u201C
QUOTES.RIGHT_DOUBLE    // \u201D
QUOTES.LEFT_SINGLE     // \u2018
QUOTES.RIGHT_SINGLE    // \u2019
QUOTES.STRAIGHT_DOUBLE // \u0022
QUOTES.STRAIGHT_SINGLE // \u0027
```

## Streaming API

For processing text streams (like AI chat responses) without re-processing already-converted content.

### `smartQuoteAsyncIterable(source)`

Wraps an `AsyncIterable<string>` to convert quotes on the fly. Use this for plain text streams.

```typescript
import { smartQuoteAsyncIterable } from 'smartquotes';

for await (const chunk of smartQuoteAsyncIterable(textStream)) {
  process.stdout.write(chunk);
}
```

### `smartQuoteTransform(options?)`

Returns a generic `TransformStream` for structured stream parts with a `text-delta` type.

```typescript
import { smartQuoteTransform } from 'smartquotes';

// Works with any stream of { type: 'text-delta', textDelta: string } parts
const stream = someTextStream.pipeThrough(smartQuoteTransform());
```

**Why streaming buffers trailing quotes:** When a chunk ends with `'` (e.g., `"don'"`), we can't determine if it's an apostrophe or closing quote until the next chunk arrives. Both streaming APIs handle this automatically.

## Vercel AI SDK Integration

For Vercel AI SDK v5+, use the dedicated `smartquotes/ai-sdk` entry point which provides properly typed transforms:

```bash
npm install smartquotes ai@>=5.0.0
```

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { smartQuoteTransform } from 'smartquotes/ai-sdk';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages,
    experimental_transform: smartQuoteTransform,
  });

  return result.toDataStreamResponse();
}
```

The `smartquotes/ai-sdk` module exports:
- `smartQuoteTransform` - Typed for `StreamTextTransform<ToolSet>`
- `convertToSmartQuotes` - Re-exported for convenience
- `QUOTES` - Re-exported for convenience

See [`examples/vercel-ai-sdk/`](./examples/vercel-ai-sdk) for a complete runnable example.

## ESLint Plugin

Enforce smart quotes in JSX/TSX at build time.

```javascript
// eslint.config.js
import { plugin as smartQuotesPlugin } from 'smartquotes/eslint';

export default [
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      smartquotes: smartQuotesPlugin,
    },
    rules: {
      'smartquotes/smart-quotes': 'error',
    },
  },
];
```

### What It Checks

- **JSX text content:** `<p>Click "here"</p>` (always user-facing)
- **Allowlisted props:** `placeholder`, `title`, `alt`, `label`, `aria-label`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`

Non-user-facing props (`className`, `href`, `id`, `key`, etc.) are ignored.

### Options

```javascript
// Add props to the default allowlist
'smartquotes/smart-quotes': ['error', {
  additionalProps: ['data-tooltip', 'data-label']
}]

// Override defaults entirely
'smartquotes/smart-quotes': ['error', {
  props: ['placeholder', 'title']
}]
```

### Auto-fix

Run `eslint --fix` to automatically convert straight quotes to smart quotes in JSX.

## Algorithm

Based on the algorithm from [pensee.com/dunham/smartQuotes.html](http://pensee.com/dunham/smartQuotes.html).

**Opening quotes** are used when:
1. At the beginning of text
2. After whitespace (space, tab, newline)
3. After left punctuation: `( [ { <`
4. After an opening quote of the opposite type (nested quotes)

**Closing quotes** are used in all other cases.

**Apostrophes** are detected when a single quote appears between two letters (`don't`, `it's`).

## Performance

The streaming API processes chunks incrementally (O(n) total) rather than re-processing accumulated text (O(n²)). For long AI responses, this can be 100x+ faster.

```
Benchmark: article-length streaming
- Incremental API: 7,364 ops/s
- Re-process each chunk: 68 ops/s
```

## Examples

See the [`examples/`](./examples) directory for runnable examples:

- [`vercel-ai-sdk/`](./examples/vercel-ai-sdk) - Streaming AI responses with the Vercel AI SDK
- [`eslint/`](./examples/eslint) - ESLint plugin for JSX/TSX files

## License

MIT
