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

**Always run commands at the monorepo root** (not filtered to a single package) to catch cross-package issues.

### Root workspace commands

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build all packages
pnpm test             # Test all packages
pnpm check-types      # Type check all packages
pnpm lint             # Lint all packages
```

### Smartquote package (packages/smartquote/)

```bash
pnpm --filter smartquote build        # Build with tsup
pnpm --filter smartquote test         # Run all tests once
pnpm --filter smartquote test:watch   # Run tests in watch mode
pnpm --filter smartquote bench        # Run performance benchmarks
pnpm --filter smartquote lint         # ESLint on src/
pnpm --filter smartquote check-types  # TypeScript type checking
pnpm --filter smartquote docs         # Generate API docs with TypeDoc
```

Or from within the package directory:

```bash
cd packages/smartquote
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

### Smartquote npm Package (`packages/smartquote/`)

Provides smart quote conversion utilities and an ESLint plugin, exported via three entry points:

- `smartquotes` (main): Core conversion functions from `src/index.ts`
- `smartquotes/eslint`: ESLint plugin from `src/eslint/index.ts`
- `smartquotes/ai-sdk`: Vercel AI SDK integration from `src/ai-sdk/index.ts`

#### Core Module (`src/index.ts`)

- `SmartQuote` - Constants using Unicode escapes (critical: LLMs normalize smart quotes to straight quotes, so always use `\u201C` etc.)
- `smartQuotes()` - Context-aware batch conversion
- `smartQuoteMarkdown()` - Markdown-aware conversion that preserves code blocks via placeholder extraction

**Streaming API** (for AI responses):
- `smartQuoteTransform(options?)` - Returns a generic `TransformStream` for structured stream parts
- `smartQuoteAsyncIterable(source, options?)` - Wraps an `AsyncIterable<string>` for plain text streams
- Both accept `{ disableMarkdown?: boolean }` - set `true` to convert quotes even inside code blocks

#### Vercel AI SDK Module (`src/ai-sdk/index.ts`)

- `smartQuoteTransform` - Typed as `StreamTextTransform<ToolSet>` for Vercel AI SDK v5+
- Re-exports `SmartQuote` and `smartQuotes` for convenience
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
- `smartquotes.SmartQuote` - Quote character constants

## Key Implementation Details

- Quote constants must use Unicode escapes (`\u201C`) not literal smart quotes - LLMs will normalize them
- The markdown processor extracts code blocks to placeholders in order: fenced → inline → indented
- ESLint rule uses allowlist for props (not denylist) to avoid false positives on non-user-facing strings
- Streaming API buffers trailing single quotes to detect apostrophes across chunk boundaries (flush with `transform.flush()`)
- Options use `disableMarkdown` (default `false`) not `markdown` - boolean options should default to `false`

## Workspace Configuration

- `pnpm-workspace.yaml` defines workspace packages
- Examples use `workspace:*` protocol to reference the smartquotes package
- Root `package.json` is private and contains shared dev dependencies (husky, commitlint)
- After changing exports in `packages/smartquote`, run `pnpm --filter smartquote build` before `pnpm check-types` - dependent packages import from `dist/`, not source

## Commit Convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

**Do NOT include Co-Authored-By lines for Claude/AI in commit messages.**

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
- `pre-commit`: runs lint, type check, and test across all packages
- `commit-msg`: validates commit message format

## Releases

Releases are automated via [Release Please](https://github.com/googleapis/release-please):

1. Push commits to main with conventional commit messages
2. Release Please automatically creates/updates a "Release PR"
3. Merging the PR creates a GitHub release and triggers npm publish

Version bumps are determined by commit types:
- `fix:` → patch (0.1.0 → 0.1.1)
- `feat:` → minor (0.1.0 → 0.2.0)
- `feat!:` or `BREAKING CHANGE:` → major (0.1.0 → 1.0.0)

npm publishing uses trusted publishing (OIDC) - no tokens required.

## CI/CD

CI (`.github/workflows/ci.yml`) runs on push/PR to main:
- Commitlint validation
- Node.js: lint, type check, test, build
- Python: ruff, mypy, pytest

Other workflows:
- `release-please.yml`: Creates release PRs from conventional commits
- `publish.yml`: Publishes to npm when a release is created
