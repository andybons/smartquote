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
import type { SmartQuoteTransformOptions } from '../index.js';
import { createMarkdownTextTransform, createTextTransform } from '../index.js';

// Re-export types and utilities for convenience
export type { SmartQuoteTransformOptions } from '../index.js';
export { SmartQuote, smartQuotes } from '../index.js';

/**
 * Smart quote transform for Vercel AI SDK's `experimental_transform`.
 *
 * Converts straight quotes to typographically correct smart quotes
 * in streaming AI responses. See module documentation for examples.
 */
export function smartQuoteTransform(
  options?: SmartQuoteTransformOptions,
): StreamTextTransform<ToolSet> {
  return () => {
    const transform = options?.disableMarkdown
      ? createTextTransform()
      : createMarkdownTextTransform();

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
