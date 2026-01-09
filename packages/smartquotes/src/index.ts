/**
 * Smart quote character constants using Unicode escapes.
 *
 * @remarks
 * These constants use Unicode escapes (`\u201C`) rather than literal smart quote
 * characters because LLMs normalize smart quotes to straight quotes during processing.
 *
 * @example
 * ```ts
 * import { SmartQuote } from 'smartquote';
 *
 * const { LeftDouble, RightDouble } = SmartQuote;
 * console.log(`${LeftDouble}Hello${RightDouble}`); // "Hello"
 * ```
 */
export const SmartQuote = {
  /** Left double quotation mark: \u201C */
  LeftDouble: '\u201C',
  /** Right double quotation mark: \u201D */
  RightDouble: '\u201D',
  /** Left single quotation mark: \u2018 */
  LeftSingle: '\u2018',
  /** Right single quotation mark (also used for apostrophes): \u2019 */
  RightSingle: '\u2019',
  /** Straight double quote: \u0022 */
  StraightDouble: '\u0022',
  /** Straight single quote/apostrophe: \u0027 */
  StraightSingle: '\u0027',
} as const;

// Characters that indicate an opening quote should follow
const OPENING_CONTEXT = new Set([
  ' ',
  '\t',
  '\n',
  '\r', // whitespace
  '(',
  '[',
  '{',
  '<', // left punctuation
  SmartQuote.LeftDouble, // for nested quotes
  SmartQuote.LeftSingle,
]);

const LETTER_REGEX = /[a-zA-Z]/;

function isLetter(char: string): boolean {
  return LETTER_REGEX.test(char);
}

function isOpeningContext(prevChar: string, isStart: boolean, oppositeQuote: string): boolean {
  return isStart || OPENING_CONTEXT.has(prevChar) || prevChar === oppositeQuote;
}

/**
 * Core conversion logic shared by both batch and streaming APIs.
 * Returns the converted character(s) for a given position.
 */
function convertChar(
  char: string,
  prevChar: string,
  nextChar: string,
  isStart: boolean,
): string {
  if (char === SmartQuote.StraightDouble) {
    return isOpeningContext(prevChar, isStart, SmartQuote.LeftSingle)
      ? SmartQuote.LeftDouble
      : SmartQuote.RightDouble;
  }

  if (char === SmartQuote.StraightSingle) {
    // Apostrophe: preceded by a letter AND followed by a letter
    if (isLetter(prevChar) && isLetter(nextChar)) {
      return SmartQuote.RightSingle;
    }
    return isOpeningContext(prevChar, isStart, SmartQuote.LeftDouble)
      ? SmartQuote.LeftSingle
      : SmartQuote.RightSingle;
  }

  return char;
}

/**
 * Converts straight quotes to typographically correct smart quotes.
 *
 * @param text - The input text containing straight quotes
 * @returns Text with straight quotes converted to smart quotes
 *
 * @remarks
 * Uses the algorithm from {@link http://pensee.com/dunham/smartQuotes.html}.
 *
 * **Opening quote rules** - use opening quotes when:
 * - At beginning of text
 * - Following whitespace (space, tab, newline)
 * - After left punctuation: `( [ { <`
 * - After opening quote of opposite type (for nested quotes)
 *
 * **Closing quote rules** - use closing quotes in all other cases.
 *
 * **Apostrophes** - single quotes between letters use right single quote.
 *
 * @example Basic usage
 * ```ts
 * import { smartQuotes } from 'smartquote';
 *
 * smartQuotes('"Hello, world!"');
 * // Returns: \u201CHello, world!\u201D
 *
 * smartQuotes("It's a beautiful day");
 * // Returns: It\u2019s a beautiful day
 * ```
 *
 * @example Nested quotes
 * ```ts
 * smartQuotes(`He said "She told me 'yes'"`);
 * // Outer double quotes, inner single quotes
 * ```
 */
export function smartQuotes(text: string): string {
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const prevChar = text[i - 1] ?? '';
    const nextChar = text[i + 1] ?? '';

    result += convertChar(char, prevChar, nextChar, i === 0);
  }

  return result;
}

/**
 * Internal state for streaming smart quote conversion (non-Markdown).
 */
interface StreamState {
  lastChar: string;
  pending: string;
}

/**
 * Incrementally converts a chunk of text to smart quotes (non-Markdown).
 */
function convertStreaming(chunk: string, state: StreamState): string {
  if (chunk.length === 0) {
    return '';
  }

  // Prepend any pending content from previous chunk
  const input = state.pending + chunk;
  state.pending = '';

  const result: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    const prevChar = i > 0 ? input[i - 1]! : state.lastChar;
    const nextChar = input[i + 1] ?? '';
    const isStart = i === 0 && state.lastChar === '';

    // If this is a single quote at the end, we can't determine if it's an apostrophe
    // without seeing the next character - buffer it for the next chunk
    if (char === SmartQuote.StraightSingle && i === input.length - 1) {
      state.pending = char;
      break;
    }

    result.push(convertChar(char, prevChar, nextChar, isStart));
  }

  // Update state for next chunk
  if (result.length > 0) {
    state.lastChar = result[result.length - 1]!;
  }

  return result.join('');
}

/**
 * Creates a stateful text transform function for streaming conversion.
 *
 * Use this to build custom stream transforms for any streaming format.
 * The returned function converts text incrementally and handles quote
 * context across chunk boundaries.
 *
 * @returns A transform function with a `flush()` method for final buffered content
 *
 * @example Building a custom transform
 * ```ts
 * import { createTextTransform } from 'smartquote';
 *
 * const transform = createTextTransform();
 *
 * // Process chunks incrementally
 * console.log(transform('He said "'));  // He said "
 * console.log(transform('hello"'));     // hello"
 * console.log(transform.flush());       // (any remaining buffered content)
 * ```
 */
export function createTextTransform(): ((chunk: string) => string) & { flush: () => string } {
  const state: StreamState = { lastChar: '', pending: '' };

  function transform(chunk: string): string {
    return convertStreaming(chunk, state);
  }

  transform.flush = function (): string {
    const pending = state.pending;
    state.pending = '';
    return pending;
  };

  return transform;
}

/**
 * State for Markdown-aware streaming conversion.
 * Tracks whether we're inside code blocks to avoid converting quotes there.
 */
interface MarkdownStreamState {
  /** Current parsing mode */
  mode: 'prose' | 'fence' | 'inline';
  /** Buffered content waiting for more context */
  buffer: string;
  /** The backtick sequence that opened the current fence (e.g., "```") */
  fenceOpener: string;
  /** The backtick sequence that opened the current inline code */
  inlineOpener: string;
  /** Whether we're at the start of a line (for fence detection) */
  atLineStart: boolean;
  /** Last emitted character (for quote context) */
  lastChar: string;
  /** Whether this is the very start of the stream */
  isStart: boolean;
}

/**
 * Count consecutive backticks at the start of a string.
 */
function countLeadingBackticks(s: string): number {
  let count = 0;
  while (count < s.length && s[count] === '`') {
    count++;
  }
  return count;
}

/**
 * Markdown-aware streaming conversion.
 * Handles fenced code blocks (```) and inline code (`).
 */
function convertMarkdownStreaming(chunk: string, state: MarkdownStreamState): string {
  if (chunk.length === 0) return '';

  // Prepend any buffered content
  const input = state.buffer + chunk;
  state.buffer = '';

  let result = '';
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;
    const remaining = input.slice(i);

    if (state.mode === 'prose') {
      // Look for backticks that might start code
      if (char === '`') {
        const backtickCount = countLeadingBackticks(remaining);
        const afterBackticks = remaining.slice(backtickCount);

        // Check if this could be a fence opener (at line start, 3+ backticks)
        if (state.atLineStart && backtickCount >= 3) {
          // Need to see if there's a newline after the language tag (or immediately)
          // to confirm it's a fence, not inline code
          const newlineIdx = afterBackticks.indexOf('\n');
          if (newlineIdx === -1) {
            // Haven't seen newline yet - buffer and wait
            state.buffer = remaining;
            return result;
          }
          // It's a fence opener
          state.mode = 'fence';
          state.fenceOpener = '`'.repeat(backtickCount);
          state.atLineStart = true; // After newline in fence
          // Output backticks and everything up to and including newline unchanged
          const fenceHeader = remaining.slice(0, backtickCount + newlineIdx + 1);
          result += fenceHeader;
          i += fenceHeader.length;
          continue;
        }

        // Check for inline code
        if (backtickCount > 0) {
          // Look for matching closing backticks
          const closer = '`'.repeat(backtickCount);
          const closerIdx = afterBackticks.indexOf(closer);

          if (closerIdx === -1) {
            // Haven't found closer - buffer and wait
            state.buffer = remaining;
            return result;
          }

          // Found complete inline code span - output unchanged
          state.mode = 'prose'; // Stay in prose
          const inlineCode = remaining.slice(0, backtickCount + closerIdx + backtickCount);
          result += inlineCode;
          i += inlineCode.length;
          // Update state
          state.lastChar = '`';
          state.atLineStart = false;
          state.isStart = false;
          continue;
        }
      }

      // Regular prose character - convert quotes
      // But first check if we're at end and it's a single quote (apostrophe buffering)
      if (char === SmartQuote.StraightSingle && i === input.length - 1) {
        state.buffer = char;
        return result;
      }

      const prevChar = i > 0 ? input[i - 1]! : state.lastChar;
      const nextChar = input[i + 1] ?? '';
      result += convertChar(char, prevChar, nextChar, state.isStart && result.length === 0 && i === 0);

      state.lastChar = result[result.length - 1]!;
      state.atLineStart = char === '\n';
      state.isStart = false;
      i++;
    } else if (state.mode === 'fence') {
      // Inside fenced code block - look for closing fence
      if (state.atLineStart && char === '`') {
        const backtickCount = countLeadingBackticks(remaining);
        if (backtickCount >= state.fenceOpener.length) {
          // Check if followed by newline or end
          const afterBackticks = remaining.slice(backtickCount);
          // Closing fence: backticks at line start, optionally followed by newline
          // We need to see what comes after the backticks
          if (afterBackticks.length === 0) {
            // End of chunk right after backticks - could be closing fence
            // Buffer it to see if newline or more content follows
            state.buffer = remaining;
            return result;
          }

          // Check if it's a valid fence close (followed by newline, EOF, or just spaces then newline)
          const closeMatch = afterBackticks.match(/^[ \t]*(\n|$)/);
          if (closeMatch) {
            // It's a closing fence
            const closeFence = '`'.repeat(backtickCount) + (closeMatch[0] ?? '');
            result += closeFence;
            i += closeFence.length;
            state.mode = 'prose';
            state.fenceOpener = '';
            state.atLineStart = closeMatch[0]?.includes('\n') ?? true;
            state.lastChar = closeFence[closeFence.length - 1] ?? state.lastChar;
            continue;
          }
        }
      }

      // Regular character inside fence - pass through unchanged
      result += char;
      state.atLineStart = char === '\n';
      state.lastChar = char;
      i++;
    } else if (state.mode === 'inline') {
      // Inside inline code - look for closing backticks
      const closerIdx = remaining.indexOf(state.inlineOpener);
      if (closerIdx === -1) {
        // No closer found - output remaining and buffer nothing
        // Actually, we should output everything since inline code must close
        // on the same "line" conceptually for most use cases
        result += remaining;
        state.lastChar = remaining[remaining.length - 1] ?? state.lastChar;
        return result;
      }

      // Found closer
      const inlineContent = remaining.slice(0, closerIdx + state.inlineOpener.length);
      result += inlineContent;
      i += inlineContent.length;
      state.mode = 'prose';
      state.inlineOpener = '';
      state.lastChar = '`';
      state.atLineStart = false;
    }
  }

  return result;
}

/**
 * Creates a Markdown-aware stateful text transform function for streaming conversion.
 *
 * Like {@link createTextTransform}, but preserves straight quotes inside code blocks
 * (fenced and inline) while converting quotes in prose.
 *
 * Use this to build custom stream transforms for Markdown content.
 *
 * @returns A transform function with a `flush()` method for final buffered content
 *
 * @example Building a custom Markdown-aware transform
 * ```ts
 * import { createMarkdownTextTransform } from 'smartquote';
 *
 * const transform = createMarkdownTextTransform();
 *
 * // Quotes in prose are converted
 * console.log(transform('She said "hello"\n'));
 *
 * // Quotes in code blocks are preserved
 * console.log(transform('```js\nconst x = "world";\n```'));
 *
 * // Don't forget to flush at the end
 * console.log(transform.flush());
 * ```
 */
export function createMarkdownTextTransform(): ((chunk: string) => string) & { flush: () => string } {
  const state: MarkdownStreamState = {
    mode: 'prose',
    buffer: '',
    fenceOpener: '',
    inlineOpener: '',
    atLineStart: true,
    lastChar: '',
    isStart: true,
  };

  function transform(chunk: string): string {
    return convertMarkdownStreaming(chunk, state);
  }

  transform.flush = function (): string {
    // Flush any buffered content
    const buffered = state.buffer;
    state.buffer = '';

    if (buffered.length === 0) return '';

    // If we're in fence mode or have a trailing single quote, output as-is
    // (we can't determine the quote type without knowing what follows)
    if (state.mode === 'fence' || buffered === SmartQuote.StraightSingle) {
      return buffered;
    }

    // For buffered backticks that never became code blocks, convert as prose
    return smartQuotes(buffered);
  };

  return transform;
}

/**
 * Options for streaming smart quote conversion.
 *
 * @example
 * ```ts
 * // Default: Markdown-aware (preserves code blocks)
 * smartQuoteTransform();
 *
 * // Disable Markdown awareness (convert all quotes)
 * smartQuoteTransform({ disableMarkdown: true });
 * ```
 */
export interface SmartQuoteTransformOptions {
  /**
   * Disable Markdown-aware conversion that preserves code blocks.
   *
   * When `false` (default), quotes inside fenced code blocks and inline code
   * are left unchanged. Set to `true` to convert all quotes regardless of context.
   *
   * @defaultValue false
   */
  disableMarkdown?: boolean;
}

/**
 * Creates a TransformStream for streaming smart quote conversion of plain text.
 *
 * @param options - Configuration options
 * @returns A TransformStream that converts string chunks
 *
 * @remarks
 * Works with plain string streams. By default, uses Markdown-aware conversion
 * that preserves quotes inside code blocks.
 *
 * For Vercel AI SDK structured streams, use `smartquotes/ai-sdk` instead.
 *
 * @example Basic usage with streams
 * ```ts
 * import { smartQuoteTransform } from 'smartquote';
 *
 * const response = await fetch('/api/stream');
 * const transformed = response.body
 *   .pipeThrough(new TextDecoderStream())
 *   .pipeThrough(smartQuoteTransform());
 * ```
 *
 * @example Disable Markdown awareness
 * ```ts
 * const transformed = textStream.pipeThrough(
 *   smartQuoteTransform({ disableMarkdown: true })
 * );
 * ```
 */
export function smartQuoteTransform(
  options?: SmartQuoteTransformOptions,
): TransformStream<string, string> {
  const transform = options?.disableMarkdown ? createTextTransform() : createMarkdownTextTransform();

  return new TransformStream({
    transform(chunk, controller) {
      const converted = transform(chunk);
      if (converted) {
        controller.enqueue(converted);
      }
    },
    flush(controller) {
      const remaining = transform.flush();
      if (remaining) {
        controller.enqueue(remaining);
      }
    },
  });
}

/**
 * Wraps an async iterable of strings to convert smart quotes on the fly.
 *
 * @param source - An async iterable yielding string chunks
 * @param options - Configuration options
 * @returns An async generator yielding converted string chunks
 *
 * @remarks
 * By default, uses Markdown-aware conversion that preserves quotes inside code blocks.
 *
 * @example Basic usage
 * ```ts
 * import { smartQuoteAsyncIterable } from 'smartquote';
 *
 * async function* generateText() {
 *   yield 'He said "hello" ';
 *   yield 'and "goodbye"';
 * }
 *
 * for await (const chunk of smartQuoteAsyncIterable(generateText())) {
 *   process.stdout.write(chunk);
 * }
 * ```
 *
 * @example With fetch streaming
 * ```ts
 * const response = await fetch('/api/stream');
 * const reader = response.body!.getReader();
 * const decoder = new TextDecoder();
 *
 * async function* readStream() {
 *   while (true) {
 *     const { done, value } = await reader.read();
 *     if (done) break;
 *     yield decoder.decode(value);
 *   }
 * }
 *
 * for await (const chunk of smartQuoteAsyncIterable(readStream())) {
 *   console.log(chunk);
 * }
 * ```
 */
export async function* smartQuoteAsyncIterable(
  source: AsyncIterable<string>,
  options?: SmartQuoteTransformOptions,
): AsyncGenerator<string, void, undefined> {
  const transform = options?.disableMarkdown ? createTextTransform() : createMarkdownTextTransform();

  for await (const chunk of source) {
    const converted = transform(chunk);
    if (converted) {
      yield converted;
    }
  }

  const remaining = transform.flush();
  if (remaining) {
    yield remaining;
  }
}

/**
 * Checks if a string contains any straight quotes that need conversion.
 * Used internally by smartQuoteMarkdown for early-exit optimization.
 */
function hasStraightQuotes(text: string): boolean {
  return text.includes(SmartQuote.StraightDouble) || text.includes(SmartQuote.StraightSingle);
}

// Placeholder uses angle brackets with unique prefix - virtually impossible in real Markdown
// since << and >> are not valid Markdown syntax and the prefix is specific enough
const PLACEHOLDER_PREFIX = '<<SMART_QUOTES_CODE_BLOCK_';
const PLACEHOLDER_SUFFIX = '>>';

interface CodeBlock {
  placeholder: string;
  content: string;
}

/**
 * Markdown-aware smart quote conversion that preserves code blocks.
 *
 * @param text - Markdown text containing straight quotes
 * @returns Text with straight quotes converted to smart quotes, except in code blocks
 *
 * @remarks
 * Preserves straight quotes inside:
 * - Fenced code blocks (` ``` `)
 * - Inline code (`` ` ``)
 * - Indented code blocks (4 spaces or tab at line start)
 *
 * @example
 * ```ts
 * import { smartQuoteMarkdown } from 'smartquote';
 *
 * const markdown = `
 * "This quote converts," she said.
 *
 * \`\`\`js
 * const x = "stays straight";
 * \`\`\`
 *
 * Use \`"straight"\` in inline code.
 * `;
 *
 * smartQuoteMarkdown(markdown);
 * // Prose gets smart quotes; code blocks unchanged
 * ```
 */
export function smartQuoteMarkdown(text: string): string {
  // Early exit: no quotes to convert
  if (!hasStraightQuotes(text)) {
    return text;
  }

  const codeBlocks: CodeBlock[] = [];
  let placeholderIndex = 0;

  function createPlaceholder(content: string): string {
    const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;
    codeBlocks.push({ placeholder, content });
    placeholderIndex++;
    return placeholder;
  }

  let processed = text;

  // IMPORTANT: Order matters. Process in this sequence:
  // 1. Fenced blocks first (``` delimiters are most specific)
  // 2. Inline code second (backticks that weren't part of fenced blocks)
  // 3. Indented blocks last (4-space/tab indentation)
  // Each regex won't match placeholder content from previous steps.

  // 1. Extract fenced code blocks (```...```)
  processed = processed.replace(/```[\s\S]*?```/g, (match) => createPlaceholder(match));

  // 2. Extract inline code - use backreference to ensure matching backtick counts
  // Handles: `code`, ``code with ` inside``, and empty spans like ``
  processed = processed.replace(/(`+)[\s\S]*?\1/g, (match) => createPlaceholder(match));

  // 3. Extract indented code blocks (4 spaces or tab at start of line)
  // Use .* to allow blank lines within indented blocks
  processed = processed.replace(
    /(?:^|\n)((?:[ ]{4}|\t).*(?:\n(?:[ ]{4}|\t).*)*)/g,
    (match) => createPlaceholder(match),
  );

  // 4. Apply smart quote conversion to remaining prose
  processed = smartQuotes(processed);

  // 5. Restore code blocks from placeholders (use split/join to replace all occurrences)
  for (const { placeholder, content } of codeBlocks) {
    processed = processed.split(placeholder).join(content);
  }

  return processed;
}
