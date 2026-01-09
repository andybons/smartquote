# Vercel AI SDK + Smart Quotes Example

This example demonstrates integrating `smartquotes` with the Vercel AI SDK to automatically convert AI responses to use typographically correct smart quotes.

## Setup

```bash
cd examples/vercel-ai-sdk
pnpm install
```

## Run

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run with default prompt
pnpm start

# Or provide a custom prompt
pnpm start "Tell me a story with lots of dialogue"
```

## What It Does

1. Sends a prompt to Claude
2. Applies smart quote conversion via `experimental_transform`
3. Streams the response to stdout with smart quotes applied in real-time
4. Verifies the output contains smart quote Unicode characters

## Expected Output

```
Prompt: Write a short paragraph about typography...
---
Typography isn't just about making text look pretty—it's the art of "giving
language a visual form" that enhances communication...
---
Smart double quotes present: true
Smart single quotes present: true

Sample smart quote code points found:
  ' = U+2019
```

The quotes in the output are curly/smart quotes (`\u201C` `\u201D` `\u2018` `\u2019`) rather than straight quotes.

## How It Works

The `smartQuoteTransform` function from `smartquotes/ai-sdk` is typed for the Vercel AI SDK's `experimental_transform` option:

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { smartQuoteTransform } from 'smartquotes/ai-sdk';

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt,
  experimental_transform: smartQuoteTransform,
});
```

The transform automatically:
1. Handles structured stream parts (`text-delta`, `step-start`, etc.)
2. Extracts and transforms text from `text-delta` parts
3. Passes through other event types unchanged
4. Buffers trailing single quotes to correctly detect apostrophes across chunk boundaries

## Requirements

- `ai@>=5.0.0` (Vercel AI SDK v5+)
- `@ai-sdk/anthropic@^2.0.0` (or another provider)
