// MUST use Unicode escapes - LLMs normalize smart quote characters to straight quotes
export const QUOTES = {
  LEFT_DOUBLE: '\u201C',
  RIGHT_DOUBLE: '\u201D',
  LEFT_SINGLE: '\u2018',
  RIGHT_SINGLE: '\u2019',
  STRAIGHT_DOUBLE: '\u0022',
  STRAIGHT_SINGLE: '\u0027',
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
  QUOTES.LEFT_DOUBLE, // for nested quotes
  QUOTES.LEFT_SINGLE,
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
  if (char === QUOTES.STRAIGHT_DOUBLE) {
    return isOpeningContext(prevChar, isStart, QUOTES.LEFT_SINGLE)
      ? QUOTES.LEFT_DOUBLE
      : QUOTES.RIGHT_DOUBLE;
  }

  if (char === QUOTES.STRAIGHT_SINGLE) {
    // Apostrophe: preceded by a letter AND followed by a letter
    if (isLetter(prevChar) && isLetter(nextChar)) {
      return QUOTES.RIGHT_SINGLE;
    }
    return isOpeningContext(prevChar, isStart, QUOTES.LEFT_DOUBLE)
      ? QUOTES.LEFT_SINGLE
      : QUOTES.RIGHT_SINGLE;
  }

  return char;
}

/**
 * Converts straight quotes to smart quotes using the algorithm from
 * pensee.com/dunham/smartQuotes.html
 *
 * Opening quote rules - use opening quotes when:
 * - At beginning of text
 * - Following whitespace (space, tab, newline)
 * - After left punctuation: ( [ { <
 * - After opening quote of opposite type (for nested quotes)
 *
 * Closing quote rules - use closing quotes in all other cases.
 *
 * Apostrophes - single quotes inside words use right single quote.
 */
export function convertToSmartQuotes(text: string): string {
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
 * Internal state for streaming smart quote conversion.
 */
interface StreamState {
  lastChar: string;
  pending: string;
}

/**
 * Incrementally converts a chunk of text to smart quotes.
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
    if (char === QUOTES.STRAIGHT_SINGLE && i === input.length - 1) {
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
 * Internal helper: creates a stateful text transform function.
 */
function createTextTransform(): ((chunk: string) => string) & { flush: () => string } {
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

// Stream part types from Vercel AI SDK
interface TextDeltaPart {
  type: 'text-delta';
  textDelta: string;
}

type StreamPart = TextDeltaPart | { type: string; [key: string]: unknown };

/**
 * Options for smartQuoteTransform.
 */
export type SmartQuoteTransformOptions = Record<string, never>;

/**
 * Creates a TransformStream for use with Vercel AI SDK's experimental_transform.
 * Converts straight quotes to smart quotes in streaming AI responses.
 *
 * @example
 * ```ts
 * import { streamText } from 'ai';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { smartQuoteTransform } from 'smartquotes';
 *
 * const result = streamText({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   messages,
 *   experimental_transform: smartQuoteTransform,
 * });
 * ```
 */
export function smartQuoteTransform(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: SmartQuoteTransformOptions,
): TransformStream<StreamPart, StreamPart> {
  const transform = createTextTransform();

  return new TransformStream({
    transform(part, controller) {
      if (part.type === 'text-delta') {
        const converted = transform((part as TextDeltaPart).textDelta);
        if (converted) {
          controller.enqueue({ type: 'text-delta', textDelta: converted });
        }
      } else {
        controller.enqueue(part);
      }
    },
    flush(controller) {
      const remaining = transform.flush();
      if (remaining) {
        controller.enqueue({ type: 'text-delta', textDelta: remaining });
      }
    },
  });
}

/**
 * Wraps an async iterable of strings to convert smart quotes on the fly.
 * Use this for plain text streams (not Vercel AI SDK).
 *
 * @example
 * ```ts
 * async function* generateText() {
 *   yield 'He said "hello" ';
 *   yield 'and "goodbye"';
 * }
 *
 * for await (const chunk of smartQuoteAsyncIterable(generateText())) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function* smartQuoteAsyncIterable(
  source: AsyncIterable<string>,
): AsyncGenerator<string, void, undefined> {
  const transform = createTextTransform();

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
  return text.includes(QUOTES.STRAIGHT_DOUBLE) || text.includes(QUOTES.STRAIGHT_SINGLE);
}

// Placeholder uses angle brackets with unique prefix - virtually impossible in real markdown
// since << and >> are not valid markdown syntax and the prefix is specific enough
const PLACEHOLDER_PREFIX = '<<SMART_QUOTES_CODE_BLOCK_';
const PLACEHOLDER_SUFFIX = '>>';

interface CodeBlock {
  placeholder: string;
  content: string;
}

/**
 * Markdown-aware smart quote conversion.
 * Preserves straight quotes inside:
 * - Fenced code blocks (```...```)
 * - Inline code (`...`)
 * - Indented code blocks (4 spaces or tab at line start)
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

  // IMPORTANT: Order matters! Process in this sequence:
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
  processed = convertToSmartQuotes(processed);

  // 5. Restore code blocks from placeholders (use split/join to replace all occurrences)
  for (const { placeholder, content } of codeBlocks) {
    processed = processed.split(placeholder).join(content);
  }

  return processed;
}
