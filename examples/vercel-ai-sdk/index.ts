/**
 * Vercel AI SDK + Smart Quotes Example
 *
 * This example demonstrates how to use smartQuoteTransform()
 * with the Vercel AI SDK to convert AI responses to use typographically
 * correct smart quotes in real-time as the response streams.
 *
 * Key feature: smartQuoteTransform() is Markdown-aware by default.
 * It converts quotes in prose but preserves straight quotes inside
 * code blocks (``` and `), which is exactly what you want for AI
 * responses that include code examples.
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
import { smartQuoteTransform, SmartQuote } from 'smartquote/ai-sdk';

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
  // Default prompt demonstrates Markdown-aware conversion:
  // - Quotes in prose get converted to smart quotes
  // - Quotes inside code blocks stay as straight quotes
  const prompt =
    process.argv[2] ||
    'Write a short explanation of how to print "Hello, World!" in JavaScript. Include a code example and use phrases like "it\'s easy" in your prose.';

  console.log('Prompt:', prompt);
  console.log('---');

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt,
    // Compose transforms: smart quotes first, then smooth streaming for better UX
    // Transforms are applied in order, so text flows through:
    // 1. smartQuoteTransform - converts straight quotes to curly quotes
    //    (Markdown-aware: preserves quotes in code blocks)
    // 2. smoothStream - buffers and releases text smoothly with small delays
    experimental_transform: [smartQuoteTransform(), smoothStream()],
  });

  // Stream the response to stdout
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  console.log('\n---');

  // Verify smart quotes were applied in prose
  const fullText = await result.text;
  const hasSmartDoubleQuotes =
    fullText.includes(SmartQuote.LeftDouble) || fullText.includes(SmartQuote.RightDouble);
  const hasSmartSingleQuotes =
    fullText.includes(SmartQuote.LeftSingle) || fullText.includes(SmartQuote.RightSingle);

  console.log('Smart quotes in prose:', hasSmartDoubleQuotes || hasSmartSingleQuotes);

  // Check if code blocks preserved straight quotes
  const codeBlockMatch = fullText.match(/```[\s\S]*?```/);
  if (codeBlockMatch) {
    const codeBlock = codeBlockMatch[0];
    const hasStraightQuotesInCode =
      codeBlock.includes(SmartQuote.StraightDouble) || codeBlock.includes(SmartQuote.StraightSingle);
    const hasSmartQuotesInCode =
      codeBlock.includes(SmartQuote.LeftDouble) || codeBlock.includes(SmartQuote.RightDouble);
    console.log('Straight quotes preserved in code:', hasStraightQuotesInCode);
    console.log('Smart quotes leaked into code:', hasSmartQuotesInCode);
    // Show first code block with char codes for debugging
    console.log('\nFirst code block (with char codes for quotes):');
    for (const char of codeBlock.slice(0, 100)) {
      const code = char.charCodeAt(0);
      if (code === 0x22 || (code >= 0x2018 && code <= 0x201d)) {
        process.stdout.write(`[U+${code.toString(16).toUpperCase()}]`);
      } else {
        process.stdout.write(char);
      }
    }
    console.log('...');
  }

  // Show sample quote characters found
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
