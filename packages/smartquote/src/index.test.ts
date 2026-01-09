import { describe, expect, it } from 'vitest';

import {
  smartQuotes,
  SmartQuote,
  smartQuoteAsyncIterable,
  smartQuoteMarkdown,
  smartQuoteTransform,
} from './index.js';

const { LeftDouble, RightDouble, LeftSingle, RightSingle } = SmartQuote;

// Shared test helpers

/** Collects all strings from a ReadableStream<string> */
async function collectStrings(readable: ReadableStream<string>): Promise<string> {
  const reader = readable.getReader();
  const results: string[] = [];
  let done = false;
  while (!done) {
    const { value, done: isDone } = await reader.read();
    if (value) {
      results.push(value);
    }
    done = isDone;
  }
  return results.join('');
}

/** Creates an async generator that yields chunks in sequence */
async function* generateChunks(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

/** Creates a ReadableStream from an array of parts */
function createReadableStream<T>(parts: T[]): ReadableStream<T> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(part);
      }
      controller.close();
    },
  });
}

describe('smartQuotes', () => {
  describe('double quotes', () => {
    it('converts simple double quotes', () => {
      expect(smartQuotes('"hello"')).toBe(`${LeftDouble}hello${RightDouble}`);
    });

    it('converts multiple quoted phrases', () => {
      expect(smartQuotes('She said "hello" and he said "goodbye"')).toBe(
        `She said ${LeftDouble}hello${RightDouble} and he said ${LeftDouble}goodbye${RightDouble}`,
      );
    });

    it('handles quotes at start of text', () => {
      expect(smartQuotes('"Start with quote"')).toBe(
        `${LeftDouble}Start with quote${RightDouble}`,
      );
    });

    it('handles quotes after newline', () => {
      expect(smartQuotes('Line 1\n"Line 2"')).toBe(
        `Line 1\n${LeftDouble}Line 2${RightDouble}`,
      );
    });

    it('handles quotes after left punctuation', () => {
      expect(smartQuotes('("quoted")')).toBe(
        `(${LeftDouble}quoted${RightDouble})`,
      );
      expect(smartQuotes('["quoted"]')).toBe(
        `[${LeftDouble}quoted${RightDouble}]`,
      );
      expect(smartQuotes('{"quoted"}')).toBe(
        `{${LeftDouble}quoted${RightDouble}}`,
      );
      expect(smartQuotes('<"quoted">')).toBe(
        `<${LeftDouble}quoted${RightDouble}>`,
      );
    });
  });

  describe('single quotes', () => {
    it('converts simple single quotes', () => {
      expect(smartQuotes("'hello'")).toBe(`${LeftSingle}hello${RightSingle}`);
    });

    it('converts multiple single-quoted phrases', () => {
      expect(smartQuotes("She said 'hi' and 'bye'")).toBe(
        `She said ${LeftSingle}hi${RightSingle} and ${LeftSingle}bye${RightSingle}`,
      );
    });
  });

  describe('apostrophes', () => {
    it("converts apostrophes in contractions (it's)", () => {
      expect(smartQuotes("it's")).toBe(`it${RightSingle}s`);
    });

    it("converts apostrophes in contractions (don't)", () => {
      expect(smartQuotes("don't")).toBe(`don${RightSingle}t`);
    });

    it("converts apostrophes in contractions (I'm)", () => {
      expect(smartQuotes("I'm")).toBe(`I${RightSingle}m`);
    });

    it('handles apostrophes in full sentences', () => {
      expect(smartQuotes("It's a beautiful day, isn't it?")).toBe(
        `It${RightSingle}s a beautiful day, isn${RightSingle}t it?`,
      );
    });

    it('handles possessives at word boundaries (plural possessive)', () => {
      // "dogs' toys" - apostrophe after s, followed by space
      expect(smartQuotes("The dogs' toys")).toBe(`The dogs${RightSingle} toys`);
    });

    it('handles possessives followed by punctuation', () => {
      expect(smartQuotes("That's the dogs'.")).toBe(
        `That${RightSingle}s the dogs${RightSingle}.`,
      );
    });

    it('handles year abbreviations (known limitation)', () => {
      // '90s - ideally should be RightSingle (apostrophe for omitted "19"),
      // but algorithm treats ' after space as opening quote.
      // This is a known edge case; most smart quote algorithms have this limitation.
      expect(smartQuotes("the '90s")).toBe(`the ${LeftSingle}90s`);
    });
  });

  describe('nested quotes', () => {
    it('handles double quotes containing single quotes', () => {
      expect(smartQuotes(`"She said 'hello'"`)).toBe(
        `${LeftDouble}She said ${LeftSingle}hello${RightSingle}${RightDouble}`,
      );
    });

    it('handles single quotes containing double quotes', () => {
      expect(smartQuotes(`'He said "hi"'`)).toBe(
        `${LeftSingle}He said ${LeftDouble}hi${RightDouble}${RightSingle}`,
      );
    });
  });

  describe('no-op cases', () => {
    it('returns text unchanged when already smart quotes', () => {
      const smartText = `${LeftDouble}hello${RightDouble}`;
      expect(smartQuotes(smartText)).toBe(smartText);
    });

    it('returns text unchanged when no quotes present', () => {
      const text = 'Hello world!';
      expect(smartQuotes(text)).toBe(text);
    });

    it('handles empty string', () => {
      expect(smartQuotes('')).toBe('');
    });
  });
});

describe('smartQuoteMarkdown', () => {
  describe('prose conversion', () => {
    it('converts quotes in plain prose', () => {
      expect(smartQuoteMarkdown('He said "hello"')).toBe(
        `He said ${LeftDouble}hello${RightDouble}`,
      );
    });

    it('converts apostrophes in prose', () => {
      expect(smartQuoteMarkdown("It's great")).toBe(`It${RightSingle}s great`);
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

      const expected = `Before ${LeftDouble}code${RightDouble}

\`\`\`js
const a = "first";
\`\`\`

Between ${LeftDouble}blocks${RightDouble}

\`\`\`py
b = "second"
\`\`\`

After ${LeftDouble}code${RightDouble}`;

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
      const expected = `Here${RightSingle}s some code:

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

      const expected = `He said ${LeftDouble}hello${RightDouble} and showed this code:

\`\`\`js
const greeting = "hello";
\`\`\`

Then he said ${LeftDouble}goodbye${RightDouble}.`;

      expect(smartQuoteMarkdown(input)).toBe(expected);
    });

    it('handles prose with inline code mixed in', () => {
      const input = 'Use "smart quotes" in text but `"straight"` in code';
      const expected = `Use ${LeftDouble}smart quotes${RightDouble} in text but \`"straight"\` in code`;
      expect(smartQuoteMarkdown(input)).toBe(expected);
    });
  });

  describe('early exit optimization', () => {
    it('returns unchanged text when no quotes present', () => {
      const input = 'Hello world! This has no quotes.';
      expect(smartQuoteMarkdown(input)).toBe(input);
    });

    it('returns unchanged text with only smart quotes', () => {
      const input = `${LeftDouble}Already smart${RightDouble}`;
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
  it('transforms string chunks through a TransformStream', async () => {
    const chunks = ['He said ', '"hello"'];
    const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
    const result = await collectStrings(transformed);

    expect(result).toBe(`He said ${LeftDouble}hello${RightDouble}`);
  });

  it('handles apostrophe at chunk boundary', async () => {
    const chunks = ["don'", 't'];
    const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
    const result = await collectStrings(transformed);

    expect(result).toBe(`don${RightSingle}t`);
  });

  it('flushes buffered content at stream end', async () => {
    const chunks = ["it'"];
    const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
    const result = await collectStrings(transformed);

    // "it" is output during streaming, "'" is flushed at end
    expect(result).toBe("it'");
  });

  it('produces same result as batch conversion', async () => {
    const text = `She said "it's wonderful" and he replied "I couldn't agree more"`;
    const chunks = text.match(/.{1,10}/g) ?? [];
    const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
    const result = await collectStrings(transformed);

    expect(result).toBe(smartQuotes(text));
  });

  it('accepts options parameter', async () => {
    const chunks = ['"hello"'];
    const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform({}));
    const result = await collectStrings(transformed);

    expect(result).toBe(`${LeftDouble}hello${RightDouble}`);
  });
});

describe('smartQuoteAsyncIterable', () => {
  it('transforms chunks from an async iterable', async () => {
    const chunks = ['He said ', '"hello"'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(`He said ${LeftDouble}hello${RightDouble}`);
  });

  it('flushes buffered content at iteration end', async () => {
    const chunks = ["don'", 't'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(`don${RightSingle}t`);
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

    expect(results.join('')).toBe(smartQuotes(text));
  });

  it('handles empty source', async () => {
    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks([]))) {
      results.push(chunk);
    }

    expect(results).toEqual([]);
  });
});

describe('smartQuoteTransform Markdown mode', () => {
  describe('fenced code blocks', () => {
    it('preserves quotes in fenced code blocks', async () => {
      const chunks = [
        'He said "hello"\n',
        '```js\n',
        'const x = "world";\n',
        '```\n',
        'Then "goodbye"',
      ];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe(
        `He said ${LeftDouble}hello${RightDouble}\n\`\`\`js\nconst x = "world";\n\`\`\`\nThen ${LeftDouble}goodbye${RightDouble}`,
      );
    });

    it('handles fence opener split across chunks', async () => {
      const chunks = [
        'Text "here"\n',
        '``',
        '`js\nconst x = "unchanged";\n```',
      ];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe(
        `Text ${LeftDouble}here${RightDouble}\n\`\`\`js\nconst x = "unchanged";\n\`\`\``,
      );
    });

    it('handles fence closer at end of stream', async () => {
      const chunks = ['```\n"code"\n```'];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe('```\n"code"\n```');
    });
  });

  describe('inline code', () => {
    it('preserves quotes in inline code', async () => {
      const chunks = [
        'Use `"',
        'quotes"` in code',
      ];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe('Use `"quotes"` in code');
    });

    it('handles inline code split across chunks', async () => {
      const chunks = [
        'He said "hi" and `const x = "',
        'test"` was shown',
      ];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe(
        `He said ${LeftDouble}hi${RightDouble} and \`const x = "test"\` was shown`,
      );
    });

    it('handles double backticks for inline code', async () => {
      const chunks = ['Use ``"quoted"`` here'];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe('Use ``"quoted"`` here');
    });
  });

  describe('disableMarkdown option', () => {
    it('converts quotes inside code blocks when Markdown is disabled', async () => {
      const chunks = ['```js\nconst x = "hello";\n```'];
      const transformed = createReadableStream(chunks).pipeThrough(
        smartQuoteTransform({ disableMarkdown: true }),
      );
      const result = await collectStrings(transformed);

      expect(result).toBe(`\`\`\`js\nconst x = ${LeftDouble}hello${RightDouble};\n\`\`\``);
    });
  });

  describe('produces same result as batch smartQuoteMarkdown', () => {
    it('matches batch conversion for mixed content', async () => {
      const text = `He said "hello" and showed \`"code"\` here.

\`\`\`js
const greeting = "world";
\`\`\`

Then "goodbye".`;

      // Split into small chunks to test streaming
      // Use [\s\S] instead of . to include newlines in chunks
      const chunks = text.match(/[\s\S]{1,15}/g) ?? [];
      const transformed = createReadableStream(chunks).pipeThrough(smartQuoteTransform());
      const result = await collectStrings(transformed);

      expect(result).toBe(smartQuoteMarkdown(text));
    });
  });
});

describe('smartQuoteAsyncIterable Markdown mode', () => {
  it('preserves quotes in fenced code blocks', async () => {
    const chunks = ['He said "hi"\n', '```\n', '"code"\n', '```'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(
      `He said ${LeftDouble}hi${RightDouble}\n\`\`\`\n"code"\n\`\`\``,
    );
  });

  it('preserves quotes in fenced code blocks with small AI-like chunks', async () => {
    // This test simulates realistic AI streaming where chunks are small and don't
    // align with Markdown structure. The bug: quotes inside fenced code blocks
    // get converted when fence boundaries are split across chunks.
    const text = 'Here is code:\n\n```js\nconst x = "hello";\n```\n\nDone!';
    // Split into very small chunks (3-5 chars) like AI streaming produces
    const chunks = text.match(/[\s\S]{1,5}/g) ?? [];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    const result = results.join('');

    // The code block should preserve straight quotes
    const codeMatch = result.match(/```[\s\S]*?```/);
    expect(codeMatch).not.toBeNull();
    if (codeMatch) {
      // Should have straight quotes in code block
      expect(codeMatch[0]).toContain('"');
      // Should NOT have smart quotes in code block
      expect(codeMatch[0]).not.toContain(LeftDouble);
      expect(codeMatch[0]).not.toContain(RightDouble);
    }
  });

  it('preserves quotes in inline code', async () => {
    const chunks = ['Use `"test"', '` here'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe('Use `"test"` here');
  });

  it('converts quotes in prose when Markdown disabled', async () => {
    // With disableMarkdown: true, quotes inside backticks should also be converted
    const chunks = ['Text with "quotes" and `"code"`'];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks), { disableMarkdown: true })) {
      results.push(chunk);
    }

    // Quotes get converted everywhere - even inside backticks
    // Note: quotes after backticks become closing quotes (RightDouble) since
    // backtick is not an "opening context" character like whitespace or (
    expect(results.join('')).toBe(
      `Text with ${LeftDouble}quotes${RightDouble} and \`${RightDouble}code${RightDouble}\``,
    );
  });

  it('matches batch smartQuoteMarkdown for complex content', async () => {
    const text = `"Hello" and \`"code"\` plus:

\`\`\`
const x = "test";
\`\`\`

"Goodbye"`;

    // Use [\s\S] instead of . to include newlines in chunks
    const chunks = text.match(/[\s\S]{1,10}/g) ?? [];

    const results: string[] = [];
    for await (const chunk of smartQuoteAsyncIterable(generateChunks(chunks))) {
      results.push(chunk);
    }

    expect(results.join('')).toBe(smartQuoteMarkdown(text));
  });
});
