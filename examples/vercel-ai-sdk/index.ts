/**
 * Vercel AI SDK + Smart Quotes Example
 *
 * This example demonstrates how to use smartQuoteTransform()
 * with the Vercel AI SDK to convert AI responses to use typographically
 * correct smart quotes in real-time as the response streams.
 *
 * It also shows how to compose multiple transforms together using
 * smoothStream for a better streaming UX.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... pnpm start
 *
 * Or set ANTHROPIC_API_KEY in your environment.
 */

import { smoothStream, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { smartQuoteTransform, QUOTES } from 'smartquotes/ai-sdk';

// Check for API key early
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  console.error('');
  console.error('To run this example:');
  console.error('  export ANTHROPIC_API_KEY=sk-ant-...');
  console.error('  pnpm start');
  process.exit(1);
}

async function main() {
  const prompt =
    process.argv[2] ||
    'Write a short paragraph about typography that includes several quoted phrases and contractions.';

  console.log('Prompt:', prompt);
  console.log('---');

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt,
    // Compose transforms: smart quotes first, then smooth streaming for better UX
    // Transforms are applied in order, so text flows through:
    // 1. smartQuoteTransform - converts straight quotes to curly quotes
    // 2. smoothStream - buffers and releases text smoothly with small delays
    experimental_transform: [smartQuoteTransform(), smoothStream()],
  });

  // Stream the response to stdout
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  console.log('\n---');

  // Verify smart quotes were applied
  const fullText = await result.text;
  const hasSmartDoubleQuotes =
    fullText.includes(QUOTES.LEFT_DOUBLE) || fullText.includes(QUOTES.RIGHT_DOUBLE);
  const hasSmartSingleQuotes =
    fullText.includes(QUOTES.LEFT_SINGLE) || fullText.includes(QUOTES.RIGHT_SINGLE);

  console.log('Smart double quotes present:', hasSmartDoubleQuotes);
  console.log('Smart single quotes present:', hasSmartSingleQuotes);

  // Show the Unicode code points for verification
  if (hasSmartDoubleQuotes || hasSmartSingleQuotes) {
    console.log('\nSample smart quote code points found:');
    for (const char of fullText) {
      const code = char.charCodeAt(0);
      if (code >= 0x2018 && code <= 0x201d) {
        console.log(`  ${char} = U+${code.toString(16).toUpperCase()}`);
        break;
      }
    }
  }
}

main().catch(console.error);
