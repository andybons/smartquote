/**
 * Vercel AI SDK integration for smartquotes.
 *
 * This module provides a properly typed transform for use with
 * the Vercel AI SDK's `experimental_transform` option.
 *
 * @example Basic usage
 * ```ts
 * import { streamText } from 'ai';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { smartQuoteTransform } from 'smartquotes/ai-sdk';
 *
 * const result = streamText({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   messages,
 *   experimental_transform: smartQuoteTransform(),
 * });
 * ```
 *
 * @example Composing with smoothStream
 * ```ts
 * import { smoothStream, streamText } from 'ai';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { smartQuoteTransform } from 'smartquotes/ai-sdk';
 *
 * const result = streamText({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   messages,
 *   // Transforms are applied in order: smart quotes first, then smooth streaming
 *   experimental_transform: [smartQuoteTransform(), smoothStream()],
 * });
 * ```
 */

import type { StreamTextTransform, TextStreamPart, ToolSet } from 'ai';
import { QUOTES } from '../index.js';

// Re-export QUOTES for convenience
export { QUOTES } from '../index.js';

/**
 * Internal state for streaming smart quote conversion.
 */
interface StreamState {
  lastChar: string;
  pending: string;
}

const LETTER_REGEX = /[a-zA-Z]/;
const OPENING_CONTEXT = new Set([
  ' ',
  '\t',
  '\n',
  '\r',
  '(',
  '[',
  '{',
  '<',
  QUOTES.LEFT_DOUBLE,
  QUOTES.LEFT_SINGLE,
]);

function isLetter(c: string): boolean {
  return LETTER_REGEX.test(c);
}

function isOpeningContext(prev: string, start: boolean, opposite: string): boolean {
  return start || OPENING_CONTEXT.has(prev) || prev === opposite;
}

/**
 * Core conversion logic.
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
 * Incrementally converts a chunk of text to smart quotes.
 */
function convertStreaming(chunk: string, state: StreamState): string {
  if (chunk.length === 0) {
    return '';
  }

  const input = state.pending + chunk;
  state.pending = '';

  const result: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    const prevChar = i > 0 ? input[i - 1]! : state.lastChar;
    const nextChar = input[i + 1] ?? '';
    const isStart = i === 0 && state.lastChar === '';

    if (char === QUOTES.STRAIGHT_SINGLE && i === input.length - 1) {
      state.pending = char;
      break;
    }

    result.push(convertChar(char, prevChar, nextChar, isStart));
  }

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

/**
 * Smart quote transform for Vercel AI SDK's `experimental_transform`.
 *
 * Converts straight quotes to typographically correct smart quotes
 * in streaming AI responses.
 *
 * @example Basic usage
 * ```ts
 * import { streamText } from 'ai';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { smartQuoteTransform } from 'smartquotes/ai-sdk';
 *
 * const result = streamText({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   messages,
 *   experimental_transform: smartQuoteTransform(),
 * });
 * ```
 *
 * @example Composing with smoothStream
 * ```ts
 * import { smoothStream, streamText } from 'ai';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { smartQuoteTransform } from 'smartquotes/ai-sdk';
 *
 * const result = streamText({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   messages,
 *   // Transforms are applied in order: smart quotes first, then smooth streaming
 *   experimental_transform: [smartQuoteTransform(), smoothStream()],
 * });
 * ```
 */
export function smartQuoteTransform(): StreamTextTransform<ToolSet> {
  return () => {
    const transform = createTextTransform();

    return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
      transform(part, controller) {
        if (part.type === 'text-delta') {
          const converted = transform(part.text);
          if (converted) {
            controller.enqueue({
              ...part,
              text: converted,
            });
          }
        } else {
          controller.enqueue(part);
        }
      },
      flush(controller) {
        const remaining = transform.flush();
        if (remaining) {
          // Generate a unique ID for the final flush chunk
          controller.enqueue({
            type: 'text-delta',
            id: `smartquotes-flush-${Date.now()}`,
            text: remaining,
          });
        }
      },
    });
  };
}

// Also export the batch conversion for convenience
export { convertToSmartQuotes } from '../index.js';
