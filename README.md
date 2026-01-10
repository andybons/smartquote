# smartquote

Smart quote conversion utilities for typographically correct quotes.

## Why this exists

Some LLMs (all Anthropic models, for instance) are incapable of outputting smart quotes, even when explicitly asked—and [Anthropic has confirmed](https://github.com/anthropics/anthropic-sdk-typescript/issues/561#issuecomment-2442675237) this won't be fixed anytime soon. This package provides a streaming transform for AI output and an ESLint rule/autofix for vibe-coded JSX/TSX.

## Packages

| Package                             | Description                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| [smartquote](./packages/smartquote) | Core library with streaming API, Vercel AI SDK integration, and ESLint plugin |
| [smartquotes (Python)](./python)    | Python port of the core conversion logic                                      |

## Quick Start

```bash
npm install smartquote
```

```typescript
import { smartQuotes } from "smartquote";

smartQuotes('"Hello," she said.');
// → “Hello,” she said.
```

See the [package README](./packages/smartquote/README.md) for full API documentation.

## Examples

- [vercel-ai-sdk](./examples/vercel-ai-sdk) - Streaming AI responses with smart quote conversion
- [eslint](./examples/eslint) - ESLint plugin for JSX/TSX files

## Development

This is a pnpm monorepo.

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Lint all packages
pnpm check-types      # Type check all packages
```

## License

MIT
