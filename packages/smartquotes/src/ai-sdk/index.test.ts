/**
 * Tests for smartQuoteTransform with Vercel AI SDK
 *
 * Uses the AI SDK testing utilities (MockLanguageModelV3, simulateReadableStream)
 * to test our transform with realistic AI streaming patterns.
 */
import { describe, expect, it } from 'vitest';
import { streamText } from 'ai';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';

import { smartQuoteTransform, SmartQuote } from './index.js';

const { LeftDouble, RightDouble, RightSingle } = SmartQuote;

// V3 mock helpers
const finishChunk = {
  type: 'finish' as const,
  finishReason: { unified: 'stop' as const, raw: undefined },
  logprobs: undefined,
  usage: {
    inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 20, text: 20, reasoning: undefined },
  },
};

function createTextChunks(texts: string[]) {
  const chunks: Array<
    | { type: 'text-start'; id: string }
    | { type: 'text-delta'; id: string; delta: string }
    | { type: 'text-end'; id: string }
    | typeof finishChunk
  > = [];
  chunks.push({ type: 'text-start', id: 'text-1' });
  for (const text of texts) {
    chunks.push({ type: 'text-delta', id: 'text-1', delta: text });
  }
  chunks.push({ type: 'text-end', id: 'text-1' });
  chunks.push(finishChunk);
  return chunks;
}

describe('smartQuoteTransform with AI SDK', () => {
  // Helper to collect full text from stream
  async function collectStreamText(
    result: Awaited<ReturnType<typeof streamText>>,
  ): Promise<string> {
    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    return text;
  }

  describe('prose conversion', () => {
    it('converts quotes in simple prose', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                'He said ',
                '"hello"',
                ' and ',
                '"goodbye".',
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      expect(text).toBe(
        `He said ${LeftDouble}hello${RightDouble} and ${LeftDouble}goodbye${RightDouble}.`,
      );
    });

    it('converts apostrophes correctly', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                "It's ",
                "wonderful, isn't it?",
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      expect(text).toBe(`It${RightSingle}s wonderful, isn${RightSingle}t it?`);
    });
  });

  describe('Markdown code block preservation', () => {
    it('preserves quotes in fenced code blocks with clean chunk boundaries', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                'Here is code:\n\n',
                '```javascript\n',
                'console.log("Hello, World!");\n',
                '```\n\n',
                "That's it!",
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      // Code block should have straight quotes
      const codeMatch = text.match(/```[\s\S]*?```/);
      expect(codeMatch).not.toBeNull();
      expect(codeMatch![0]).toContain('"Hello, World!"');
      expect(codeMatch![0]).not.toContain(LeftDouble);
      expect(codeMatch![0]).not.toContain(RightDouble);

      // Prose should have smart apostrophe
      expect(text).toContain(`That${RightSingle}s it!`);
    });

    it('preserves quotes when fence opener is split across chunks', async () => {
      // This simulates AI streaming where the backticks come in separate chunks
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                'Code:\n',
                '`',
                '`',
                '`js\n',
                'const x = "test";\n',
                '```',
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      const codeMatch = text.match(/```[\s\S]*?```/);
      expect(codeMatch).not.toBeNull();
      // Should have straight quotes preserved in code
      expect(codeMatch![0]).toContain('"test"');
      expect(codeMatch![0]).not.toContain(LeftDouble);
    });

    it('preserves quotes with very small AI-like chunks', async () => {
      // Simulates realistic AI streaming with small token-by-token output
      const fullText = 'Say "hi" then:\n\n```js\nconst msg = "hello";\n```\n\nDone!';
      // Split into 2-3 character chunks to simulate token-level streaming
      const deltas = fullText.match(/[\s\S]{1,3}/g) || [];

      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks(deltas),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      // Prose quotes should be converted
      expect(text).toMatch(new RegExp(`Say ${LeftDouble}hi${RightDouble}`));

      // Code block quotes should be preserved
      const codeMatch = text.match(/```[\s\S]*?```/);
      expect(codeMatch).not.toBeNull();
      expect(codeMatch![0]).toContain('"hello"');
      expect(codeMatch![0]).not.toContain(LeftDouble);
    });

    it('preserves quotes in inline code', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                'Use `"test"` ',
                'in your "code".',
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      // Inline code should preserve straight quotes
      expect(text).toContain('`"test"`');
      // Prose quotes should be converted
      expect(text).toContain(`${LeftDouble}code${RightDouble}`);
    });
  });

  describe('edge cases', () => {
    it('handles apostrophe at chunk boundary', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                "don'",
                't worry',
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      expect(text).toBe(`don${RightSingle}t worry`);
    });

    it('handles multiple code blocks', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                'First "example":\n\n```\n',
                '"code1"\n```\n\n',
                'Second "example":\n\n```\n',
                '"code2"\n```',
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform(),
      });

      const text = await collectStreamText(result);

      // Both prose sections should have smart quotes
      expect(text).toContain(`First ${LeftDouble}example${RightDouble}`);
      expect(text).toContain(`Second ${LeftDouble}example${RightDouble}`);

      // Both code blocks should have straight quotes
      const codeBlocks = text.match(/```[\s\S]*?```/g);
      expect(codeBlocks).toHaveLength(2);
      expect(codeBlocks![0]).toContain('"code1"');
      expect(codeBlocks![1]).toContain('"code2"');
    });
  });

  describe('disableMarkdown option', () => {
    it('converts all quotes when Markdown mode is disabled', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: createTextChunks([
                '```js\nconst x = "hello";\n```',
              ]),
            }),
          }),
        }),
        prompt: 'test',
        experimental_transform: smartQuoteTransform({ disableMarkdown: true }),
      });

      const text = await collectStreamText(result);

      // With disableMarkdown: true, quotes should be converted even in code blocks
      expect(text).toContain(LeftDouble);
      expect(text).toContain(RightDouble);
    });
  });
});
