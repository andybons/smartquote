# smartquote

Smart quote conversion utilities and ESLint plugin for typographically correct quotes.

Converts straight quotes (`"` and `'`) to their curly/smart equivalents (`\u201C` `\u201D` `\u2018` `\u2019`).

## Installation

```bash
npm install smartquote
# or
pnpm add smartquote
```

## Quick Start

```typescript
import { smartQuotes, SmartQuote } from 'smartquote';

const result = smartQuotes('She said "hello"');
// result === 'She said \u201Chello\u201D'

// Verify with constants
result.startsWith(`She said ${SmartQuote.LeftDouble}`); // true
```

## API Reference

### `smartQuotes(text: string): string`

Converts straight quotes to smart quotes using context-aware rules.

```typescript
import { smartQuotes, SmartQuote } from 'smartquote';
const { LeftDouble, RightDouble, RightSingle } = SmartQuote;

// Basic conversion
smartQuotes('"hello"');
// === `${LeftDouble}hello${RightDouble}`

// Apostrophes are detected between letters
smartQuotes("It's wonderful");
// === `It${RightSingle}s wonderful`

// Nested quotes work correctly
smartQuotes(`He said "She told me 'yes'"`);
// Outer double quotes, inner single quotes
```

### `smartQuoteMarkdown(text: string): string`

Markdown-aware conversion that preserves straight quotes inside code blocks.

```typescript
import { smartQuoteMarkdown } from 'smartquote';

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

### `SmartQuote`

Constants using Unicode escapes (immune to LLM normalization):

```typescript
import { SmartQuote } from 'smartquote';

SmartQuote.LeftDouble     // \u201C "
SmartQuote.RightDouble    // \u201D "
SmartQuote.LeftSingle     // \u2018 '
SmartQuote.RightSingle    // \u2019 '
SmartQuote.StraightDouble // \u0022 "
SmartQuote.StraightSingle // \u0027 '
```

## Streaming API

For processing text streams (like AI chat responses) without re-processing already-converted content.

### `smartQuoteAsyncIterable(source, options?)`

Wraps an `AsyncIterable<string>` to convert quotes on the fly. Use this for plain text streams.

```typescript
import { smartQuoteAsyncIterable } from 'smartquote';

for await (const chunk of smartQuoteAsyncIterable(textStream)) {
  process.stdout.write(chunk);
}

// Disable markdown-aware conversion (converts quotes even in code blocks)
for await (const chunk of smartQuoteAsyncIterable(textStream, { disableMarkdown: true })) {
  process.stdout.write(chunk);
}
```

### `smartQuoteTransform(options?)`

Returns a generic `TransformStream` for structured stream parts with a `text-delta` type.

```typescript
import { smartQuoteTransform } from 'smartquote';

// Works with any stream of { type: 'text-delta', textDelta: string } parts
const stream = someTextStream.pipeThrough(smartQuoteTransform());

// Disable markdown-aware conversion
const stream = someTextStream.pipeThrough(smartQuoteTransform({ disableMarkdown: true }));
```

### Streaming Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disableMarkdown` | `boolean` | `false` | When `false`, preserves straight quotes inside code blocks. Set to `true` to convert all quotes. |

**Why streaming buffers trailing quotes:** When a chunk ends with `'` (e.g., `"don'"`), we can't determine if it's an apostrophe or closing quote until the next chunk arrives. Both streaming APIs handle this automatically.

## Vercel AI SDK Integration

For Vercel AI SDK v5+, use the dedicated `smartquote/ai-sdk` entry point which provides properly typed transforms:

```bash
npm install smartquote ai@>=5.0.0
```

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { smartQuoteTransform } from 'smartquote/ai-sdk';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages,
    experimental_transform: smartQuoteTransform(),
  });

  return result.toDataStreamResponse();
}
```

The `smartquote/ai-sdk` module exports:
- `smartQuoteTransform` - Typed for `StreamTextTransform<ToolSet>`
- `smartQuotes` - Re-exported for convenience
- `SmartQuote` - Re-exported for convenience

See [`examples/vercel-ai-sdk/`](./examples/vercel-ai-sdk) for a complete runnable example.

## ESLint Plugin

Enforce smart quotes in JSX/TSX at build time.

```javascript
// eslint.config.js
import { plugin as smartQuotesPlugin } from 'smartquote/eslint';

export default [
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
```

### What It Checks

- **JSX text content:** `<p>Click "here"</p>` (always user-facing)
- **Allowlisted props:** `placeholder`, `title`, `alt`, `label`, `aria-label`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`

Non-user-facing props (`className`, `href`, `id`, `key`, etc.) are ignored.

### Options

```javascript
// Add props to the default allowlist
'smartquote/smart-quotes': ['error', {
  additionalProps: ['data-tooltip', 'data-label']
}]

// Override defaults entirely
'smartquote/smart-quotes': ['error', {
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

Run benchmarks locally with `pnpm --filter smartquote bench`.

## Examples

See the [`examples/`](./examples) directory for runnable examples:

- [`vercel-ai-sdk/`](./examples/vercel-ai-sdk) - Streaming AI responses with the Vercel AI SDK
- [`eslint/`](./examples/eslint) - ESLint plugin for JSX/TSX files

## License

MIT
