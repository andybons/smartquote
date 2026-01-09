import { bench, describe } from 'vitest';

import {
  convertToSmartQuotes,
  smartQuoteAsyncIterable,
  smartQuoteMarkdown,
} from './index.js';

// Realistic text samples
const sentence = 'He said "hello" and she said "goodbye"';

const paragraph = `"It's a wonderful day," she said. "Don't you think?"
He replied, "Yes, I couldn't agree more. Let's go outside."
"That's a great idea!" she exclaimed.`;

const article = paragraph.repeat(20);

const markdownDoc = `# Smart Quotes Demo

"This is a quote," she said. "It's wonderful!"

\`\`\`typescript
const message = "This should stay straight";
const name = 'Also straight';
\`\`\`

More "quoted text" here with \`inline "code"\` preserved.

    // Indented code block
    const x = "stays straight";

Final "paragraph" with 'quotes' and apostrophes like it's and don't.
`;

describe('convertToSmartQuotes', () => {
  bench('sentence', () => {
    convertToSmartQuotes(sentence);
  });

  bench('paragraph', () => {
    convertToSmartQuotes(paragraph);
  });

  bench('article (20 paragraphs)', () => {
    convertToSmartQuotes(article);
  });
});

describe('smartQuoteMarkdown', () => {
  bench('markdown document', () => {
    smartQuoteMarkdown(markdownDoc);
  });

  bench('long markdown (10 docs)', () => {
    smartQuoteMarkdown(markdownDoc.repeat(10));
  });
});

// Simulate AI streaming: text arrives in chunks
const streamingChunks = paragraph.split(' ');
const articleChunks = article.split(' ');

describe('streaming: re-process entire text each chunk (old approach)', () => {
  bench('paragraph', () => {
    let accumulated = '';
    for (const chunk of streamingChunks) {
      accumulated += (accumulated ? ' ' : '') + chunk;
      convertToSmartQuotes(accumulated);
    }
  });

  bench('article', () => {
    let accumulated = '';
    for (const chunk of articleChunks) {
      accumulated += (accumulated ? ' ' : '') + chunk;
      convertToSmartQuotes(accumulated);
    }
  });
});

describe('streaming: smartQuoteAsyncIterable', () => {
  async function* generateChunks(chunks: string[]): AsyncGenerator<string> {
    for (let i = 0; i < chunks.length; i++) {
      yield (i > 0 ? ' ' : '') + chunks[i];
    }
  }

  bench('paragraph', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(streamingChunks))) {
      // consume
    }
  });

  bench('article', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(articleChunks))) {
      // consume
    }
  });
});
