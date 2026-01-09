import { describe, expect, it } from 'vitest';

import {
  convertToSmartQuotes,
  QUOTES,
  smartQuoteAsyncIterable,
  smartQuoteMarkdown,
  smartQuoteTransform,
} from './index.js';

const { LEFT_DOUBLE, RIGHT_DOUBLE, LEFT_SINGLE, RIGHT_SINGLE } = QUOTES;

describe('convertToSmartQuotes', () => {
  describe('double quotes', () => {
    it('converts simple double quotes', () => {
      expect(convertToSmartQuotes('"hello"')).toBe(`${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`);
    });

    it('converts multiple quoted phrases', () => {
      expect(convertToSmartQuotes('She said "hello" and he said "goodbye"')).toBe(
        `She said ${LEFT_DOUBLE}hello${RIGHT_DOUBLE} and he said ${LEFT_DOUBLE}goodbye${RIGHT_DOUBLE}`,
      );
    });

    it('handles quotes at start of text', () => {
      expect(convertToSmartQuotes('"Start with quote"')).toBe(
        `${LEFT_DOUBLE}Start with quote${RIGHT_DOUBLE}`,
      );
    });

    it('handles quotes after newline', () => {
      expect(convertToSmartQuotes('Line 1\n"Line 2"')).toBe(
        `Line 1\n${LEFT_DOUBLE}Line 2${RIGHT_DOUBLE}`,
      );
    });

    it('handles quotes after left punctuation', () => {
      expect(convertToSmartQuotes('("quoted")')).toBe(
        `(${LEFT_DOUBLE}quoted${RIGHT_DOUBLE})`,
      );
      expect(convertToSmartQuotes('["quoted"]')).toBe(
        `[${LEFT_DOUBLE}quoted${RIGHT_DOUBLE}]`,
      );
      expect(convertToSmartQuotes('{"quoted"}')).toBe(
        `{${LEFT_DOUBLE}quoted${RIGHT_DOUBLE}}`,
      );
      expect(convertToSmartQuotes('<"quoted">')).toBe(
        `<${LEFT_DOUBLE}quoted${RIGHT_DOUBLE}>`,
      );
    });
  });

  describe('single quotes', () => {
    it('converts simple single quotes', () => {
      expect(convertToSmartQuotes("'hello'")).toBe(`${LEFT_SINGLE}hello${RIGHT_SINGLE}`);
    });

    it('converts multiple single-quoted phrases', () => {
      expect(convertToSmartQuotes("She said 'hi' and 'bye'")).toBe(
        `She said ${LEFT_SINGLE}hi${RIGHT_SINGLE} and ${LEFT_SINGLE}bye${RIGHT_SINGLE}`,
      );
    });
  });

  describe('apostrophes', () => {
    it("converts apostrophes in contractions (it's)", () => {
      expect(convertToSmartQuotes("it's")).toBe(`it${RIGHT_SINGLE}s`);
    });

    it("converts apostrophes in contractions (don't)", () => {
      expect(convertToSmartQuotes("don't")).toBe(`don${RIGHT_SINGLE}t`);
    });

    it("converts apostrophes in contractions (I'm)", () => {
      expect(convertToSmartQuotes("I'm")).toBe(`I${RIGHT_SINGLE}m`);
    });

    it('handles apostrophes in full sentences', () => {
      expect(convertToSmartQuotes("It's a beautiful day, isn't it?")).toBe(
        `It${RIGHT_SINGLE}s a beautiful day, isn${RIGHT_SINGLE}t it?`,
      );
    });

    it('handles possessives at word boundaries (plural possessive)', () => {
      // "dogs' toys" - apostrophe after s, followed by space
      expect(convertToSmartQuotes("The dogs' toys")).toBe(`The dogs${RIGHT_SINGLE} toys`);
    });

    it('handles possessives followed by punctuation', () => {
      expect(convertToSmartQuotes("That's the dogs'.")).toBe(
        `That${RIGHT_SINGLE}s the dogs${RIGHT_SINGLE}.`,
      );
    });

    it('handles year abbreviations (known limitation)', () => {
      // '90s - ideally should be RIGHT_SINGLE (apostrophe for omitted "19"),
      // but algorithm treats ' after space as opening quote.
      // This is a known edge case; most smart quote algorithms have this limitation.
      expect(convertToSmartQuotes("the '90s")).toBe(`the ${LEFT_SINGLE}90s`);
    });
  });

  describe('nested quotes', () => {
    it('handles double quotes containing single quotes', () => {
      expect(convertToSmartQuotes(`"She said 'hello'"`)).toBe(
        `${LEFT_DOUBLE}She said ${LEFT_SINGLE}hello${RIGHT_SINGLE}${RIGHT_DOUBLE}`,
      );
    });

    it('handles single quotes containing double quotes', () => {
      expect(convertToSmartQuotes(`'He said "hi"'`)).toBe(
        `${LEFT_SINGLE}He said ${LEFT_DOUBLE}hi${RIGHT_DOUBLE}${RIGHT_SINGLE}`,
      );
    });
  });

  describe('no-op cases', () => {
    it('returns text unchanged when already smart quotes', () => {
      const smartText = `${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`;
      expect(convertToSmartQuotes(smartText)).toBe(smartText);
    });

    it('returns text unchanged when no quotes present', () => {
      const text = 'Hello world!';
      expect(convertToSmartQuotes(text)).toBe(text);
    });

    it('handles empty string', () => {
      expect(convertToSmartQuotes('')).toBe('');
    });
  });
});

describe('smartQuoteMarkdown', () => {
  describe('prose conversion', () => {
    it('converts quotes in plain prose', () => {
      expect(smartQuoteMarkdown('He said "hello"')).toBe(
        `He said ${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`,
      );
    });

    it('converts apostrophes in prose', () => {
      expect(smartQuoteMarkdown("It's great")).toBe(`It${RIGHT_SINGLE}s great`);
    });
  });

  describe('fenced code block preservation', () => {
    it('preserves quotes in fenced code blocks', () => {
      const input = '```js\nconst x = "hello";\n```';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('preserves quotes in fenced code blocks with language', () => {
      const input = '```typescript\nconst greeting: string = "hi";\n```';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('preserves quotes in fenced code blocks without language', () => {
      const input = '```\n"quoted"\n```';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('handles multiple fenced code blocks', () => {
      const input = `Before "code"

\`\`\`js
const a = "first";
\`\`\`

Between "blocks"

\`\`\`py
b = "second"
\`\`\`

After "code"`;

      const expected = `Before ${LEFT_DOUBLE}code${RIGHT_DOUBLE}

\`\`\`js
const a = "first";
\`\`\`

Between ${LEFT_DOUBLE}blocks${RIGHT_DOUBLE}

\`\`\`py
b = "second"
\`\`\`

After ${LEFT_DOUBLE}code${RIGHT_DOUBLE}`;

      expect(smartQuoteMarkdown(input)).toBe(expected);
    });
  });

  describe('inline code preservation', () => {
    it('preserves quotes in inline code', () => {
      const input = 'Use `"quotes"` in your code';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('preserves apostrophes in inline code', () => {
      const input = "The `it's` variable";
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('handles multiple inline code spans', () => {
      const input = 'Use `"a"` or `"b"` here';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('handles double backticks for code containing backtick', () => {
      const input = 'Use ``const x = "hi"`` here';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });
  });

  describe('indented code block preservation', () => {
    it('preserves quotes in indented code blocks (4 spaces)', () => {
      const input = 'Code example:\n\n    const x = "hello";\n\nEnd.';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('preserves quotes in indented code blocks (tab)', () => {
      const input = 'Code example:\n\n\tconst x = "hello";\n\nEnd.';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('preserves multi-line indented code blocks', () => {
      const input = `Here's some code:

    const a = "first";
    const b = "second";

Done.`;
      // Note: "Here's" in prose should be converted
      const expected = `Here${RIGHT_SINGLE}s some code:

    const a = "first";
    const b = "second";

Done.`;
      expect(smartQuoteMarkdown(input)).toBe(expected);
    });
  });

  describe('mixed content', () => {
    it('transforms prose and preserves code in same text', () => {
      const input = `He said "hello" and showed this code:

\`\`\`js
const greeting = "hello";
\`\`\`

Then he said "goodbye".`;

      const expected = `He said ${LEFT_DOUBLE}hello${RIGHT_DOUBLE} and showed this code:

\`\`\`js
const greeting = "hello";
\`\`\`

Then he said ${LEFT_DOUBLE}goodbye${RIGHT_DOUBLE}.`;

      expect(smartQuoteMarkdown(input)).toBe(expected);
    });

    it('handles prose with inline code mixed in', () => {
      const input = 'Use "smart quotes" in text but `"straight"` in code';
      const expected = `Use ${LEFT_DOUBLE}smart quotes${RIGHT_DOUBLE} in text but \`"straight"\` in code`;
      expect(smartQuoteMarkdown(input)).toBe(expected);
    });
  });

  describe('early exit optimization', () => {
    it('returns unchanged text when no quotes present', () => {
      const input = 'Hello world! This has no quotes.';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('returns unchanged text with only smart quotes', () => {
      const input = `${LEFT_DOUBLE}Already smart${RIGHT_DOUBLE}`;
      expect(smartQuoteMarkdown(input)).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(smartQuoteMarkdown('')).toBe('');
    });

    it('handles text with only code blocks', () => {
      const input = '```\ncode only\n```';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('handles adjacent code blocks', () => {
      const input = '```a\n"x"\n```\n```b\n"y"\n```';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });
  });
});

describe('smartQuoteTransform', () => {
  // Helper to create text-delta stream parts
  const textDelta = (text: string) => ({ type: 'text-delta' as const, textDelta: text });

  // Helper to collect text from stream parts
  async function collectText(
    readable: ReadableStream<{ type: string; textDelta?: string }>,
  ): Promise<string> {
    const reader = readable.getReader();
    const results: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      if (value?.type === 'text-delta' && value.textDelta) {
        results.push(value.textDelta);
      }
      done = isDone;
    }
    return results.join('');
  }

  it('transforms text-delta parts through a TransformStream', async () => {
    const parts = [textDelta('He said '), textDelta('"hello"')];
    const readable = new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });

    const transformed = readable.pipeThrough(smartQuoteTransform());
    const result = await collectText(transformed);

    expect(result).toBe(`He said ${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`);
  });

  it('passes through non-text-delta parts unchanged', async () => {
    const parts = [
      { type: 'step-start', stepId: '1' },
      textDelta('"hello"'),
      { type: 'step-finish', stepId: '1' },
    ];
    const readable = new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });

    const transformed = readable.pipeThrough(smartQuoteTransform());
    const reader = transformed.getReader();

    const results: Array<{ type: string }> = [];
    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      if (value) results.push(value);
      done = isDone;
    }

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ type: 'step-start', stepId: '1' });
    expect(results[2]).toEqual({ type: 'step-finish', stepId: '1' });
  });

  it('handles apostrophe at chunk boundary', async () => {
    const parts = [textDelta("don'"), textDelta('t')];
    const readable = new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });

    const transformed = readable.pipeThrough(smartQuoteTransform());
    const result = await collectText(transformed);

    expect(result).toBe(`don${RIGHT_SINGLE}t`);
  });

  it('flushes buffered content at stream end', async () => {
    const parts = [textDelta("it'")];
    const readable = new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });

    const transformed = readable.pipeThrough(smartQuoteTransform());
    const result = await collectText(transformed);

    // "it" is output during streaming, "'" is flushed at end
    expect(result).toBe("it'");
  });

  it('produces same result as batch conversion', async () => {
    const text = `She said "it's wonderful" and he replied "I couldn't agree more"`;
    const chunks = text.match(/.{1,10}/g) ?? [];
    const parts = chunks.map(textDelta);

    const readable = new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });

    const transformed = readable.pipeThrough(smartQuoteTransform());
    const result = await collectText(transformed);

    expect(result).toBe(convertToSmartQuotes(text));
  });

  it('accepts options parameter', async () => {
    const parts = [textDelta('"hello"')];
    const readable = new ReadableStream({
      start(controller) {
        for (const part of parts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });

    // Options are reserved for future use but should be accepted
    const transformed = readable.pipeThrough(smartQuoteTransform({}));
    const result = await collectText(transformed);

    expect(result).toBe(`${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`);
  });
});

describe('smartQuoteAsyncIterable', () => {
  async function* generateChunks(chunks: string[]): AsyncGenerator<string> {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  it('transforms chunks from an async iterable', async () => {
    const chunks = ['He said ', '"hello"'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(`He said ${LEFT_DOUBLE}hello${RIGHT_DOUBLE}`);
  });

  it('flushes buffered content at iteration end', async () => {
    const chunks = ["don'", 't'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(`don${RIGHT_SINGLE}t`);
  });

  it('handles trailing single quote flush', async () => {
    // Stream ends with a buffered single quote
    const chunks = ["it'"];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    // "it" is yielded during iteration, "'" is flushed at end
    expect(results.join('')).toBe("it'");
  });

  it('produces same result as batch conversion', async () => {
    const text = `She said "it's wonderful"`;
    const chunks = text.match(/.{1,5}/g) ?? [];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(convertToSmartQuotes(text));
  });

  it('handles empty source', async () => {
    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks([]))) {
      results.push(chunk);
    }

    expect(results).toEqual([]);
  });
});
