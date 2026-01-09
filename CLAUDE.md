# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a pnpm monorepo with the following structure:

```
smartquotes/
├── apps/
│   └── web/              # Next.js website
├── examples/
│   ├── eslint/           # ESLint plugin demo
│   └── vercel-ai-sdk/    # Vercel AI SDK integration demo
├── packages/
│   └── smartquotes/      # Main npm package
└── python/               # Python package (standalone)
```

## Commands

### Root workspace commands

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build all packages
pnpm test             # Test all packages
pnpm lint             # Lint all packages
```

### Smartquotes package (packages/smartquotes/)

```bash
pnpm --filter smartquotes build        # Build with tsup
pnpm --filter smartquotes test         # Run all tests once
pnpm --filter smartquotes test:watch   # Run tests in watch mode
pnpm --filter smartquotes bench        # Run performance benchmarks
pnpm --filter smartquotes lint         # ESLint on src/
pnpm --filter smartquotes check-types  # TypeScript type checking
```

Or from within the package directory:

```bash
cd packages/smartquotes
pnpm build
pnpm test
```

### Web app (apps/web/)

```bash
pnpm --filter web dev     # Start Next.js dev server
pnpm --filter web build   # Build for production
```

### Python package (python/)

```bash
cd python
pip install -e .          # Install in development mode
pytest                    # Run tests
ruff check .              # Lint
mypy smartquotes          # Type check
```

## Architecture

### Smartquotes npm Package (`packages/smartquotes/`)

Provides smart quote conversion utilities and an ESLint plugin, exported via three entry points:

- `smartquotes` (main): Core conversion functions from `src/index.ts`
- `smartquotes/eslint`: ESLint plugin from `src/eslint/index.ts`
- `smartquotes/ai-sdk`: Vercel AI SDK integration from `src/ai-sdk/index.ts`

#### Core Module (`src/index.ts`)

- `QUOTES` - Constants using Unicode escapes (critical: LLMs normalize smart quotes to straight quotes, so always use `\u201C` etc.)
- `convertToSmartQuotes()` - Context-aware batch conversion
- `smartQuoteMarkdown()` - Markdown-aware conversion that preserves code blocks via placeholder extraction

**Streaming API** (for AI responses):
- `smartQuoteTransform(options?)` - Returns a generic `TransformStream` for structured stream parts
- `smartQuoteAsyncIterable(source)` - Wraps an `AsyncIterable<string>` for plain text streams

#### Vercel AI SDK Module (`src/ai-sdk/index.ts`)

- `smartQuoteTransform` - Typed as `StreamTextTransform<ToolSet>` for Vercel AI SDK v5+
- Re-exports `QUOTES` and `convertToSmartQuotes` for convenience
- Requires `ai@>=5.0.0` peer dependency

#### ESLint Plugin (`src/eslint/`)

- `smart-quotes-rule.ts` - Rule targeting JSX/TSX files only
  - Converts JSXText content (always user-facing)
  - Converts allowlisted props only (placeholder, title, alt, aria-label, etc.)
  - Auto-fixable; escapes smart double quotes in JSX attribute fixes

### Python Package (`python/`)

Python port of the core conversion logic:

- `smartquotes.convert_to_smart_quotes()` - Batch conversion
- `smartquotes.smart_quote_markdown()` - Markdown-aware conversion
- `smartquotes.QUOTES` - Quote character constants

## Key Implementation Details

- Quote constants must use Unicode escapes (`\u201C`) not literal smart quotes - LLMs will normalize them
- The markdown processor extracts code blocks to placeholders in order: fenced → inline → indented
- ESLint rule uses allowlist for props (not denylist) to avoid false positives on non-user-facing strings
- Streaming API buffers trailing single quotes to detect apostrophes across chunk boundaries (flush with `transform.flush()`)

## Workspace Configuration

- `pnpm-workspace.yaml` defines workspace packages
- Examples use `workspace:*` protocol to reference the smartquotes package
- Root `package.json` is private and contains shared dev dependencies (husky, commitlint)

## Commit Convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

Format:
```
type(scope?): subject

body?

footer?
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Examples:
```bash
feat: add streaming API for AI responses
fix: handle apostrophes at chunk boundaries
docs: update README with Vercel AI SDK example
refactor: extract isOpeningContext helper
test: add benchmark for smartQuoteTransform
```

Git hooks (via husky):
- `pre-commit`: runs lint and test on smartquotes package
- `commit-msg`: validates commit message format

CI (`.github/workflows/ci.yml`) runs on push/PR to main:
- Commitlint validation
- Node.js: lint, type check, test, build
- Python: ruff, mypy, pytest
