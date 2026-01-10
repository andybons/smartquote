'use client';

import { useState } from 'react';
import { SmartQuote } from 'smartquote';
import styles from './page.module.css';

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <svg
      className={styles.copyIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {copied ? (
        <polyline points="20 6 9 17 4 12" />
      ) : (
        <>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      )}
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      className={styles.githubIcon}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const installCommand = 'npm i smartquote';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className={styles.page}>
      <span className={`${styles.decorativeQuote} ${styles.openQuote}`}>
        {SmartQuote.LeftDouble}
      </span>
      <span className={`${styles.decorativeQuote} ${styles.closeQuote}`}>
        {SmartQuote.RightDouble}
      </span>
      <section className={styles.hero}>
        <h1 className={styles.title}>smartquote</h1>
      </section>
      <section className={styles.install}>
        <div className={styles.installWrapper}>
          <code className={styles.installCode}>
            <span className={styles.prompt}>$</span> {installCommand}
          </code>
          <button
            className={styles.copyButton}
            onClick={handleCopy}
            data-copied={copied}
            aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            <CopyIcon copied={copied} />
          </button>
        </div>
        <a
          href="https://github.com/andybons/smartquote"
          className={styles.githubButton}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
        >
          <GitHubIcon />
        </a>
      </section>
      <section className={styles.info}>
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>What are smart quotes?</h2>
          <p className={styles.infoParagraph}>
            Smart quotes are the curly or sloped quotation marks used in
            typography. Straight {SmartQuote.StraightDouble}dumb
            {SmartQuote.StraightDouble} quotes are a typewriter-era limitation
            and shouldn{SmartQuote.RightSingle}t be used in user-facing text.
          </p>

          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Dumb</th>
                <th>Smart</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Double quotes</td>
                <td className={`${styles.quoteCell} ${styles.dumbQuote}`}>
                  {SmartQuote.StraightDouble} {SmartQuote.StraightDouble}
                </td>
                <td className={`${styles.quoteCell} ${styles.smartQuote}`}>
                  {SmartQuote.LeftDouble} {SmartQuote.RightDouble}
                </td>
              </tr>
              <tr>
                <td>Single quotes</td>
                <td className={`${styles.quoteCell} ${styles.dumbQuote}`}>
                  {SmartQuote.StraightSingle} {SmartQuote.StraightSingle}
                </td>
                <td className={`${styles.quoteCell} ${styles.smartQuote}`}>
                  {SmartQuote.LeftSingle} {SmartQuote.RightSingle}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 className={styles.infoTitle}>Why this exists</h2>
          <p className={styles.infoParagraph}>
            Some LLMs (all Anthropic models, for instance) are incapable of
            outputting smart quotes, even when explicitly asked{'\u2014'}and{' '}
            <a
              href="https://github.com/anthropics/anthropic-sdk-typescript/issues/561#issuecomment-2442675237"
              target="_blank"
              rel="noopener noreferrer"
            >
              Anthropic has confirmed
            </a>{' '}
            this won{SmartQuote.RightSingle}t be fixed anytime soon. This
            package provides a streaming transform for AI output and an ESLint
            rule/autofix for vibe-coded JSX/TSX.
          </p>

          <h2 className={styles.infoTitle}>Usage</h2>

          <div className={styles.codeExample}>
            <h3 className={styles.exampleLabel}>Vercel AI SDK</h3>
            <pre className={styles.codeBlock}>
              <code>{`import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { smartQuoteTransform } from "smartquote/ai-sdk";

const result = streamText({
  model: anthropic("claude-sonnet-4-5"),
  prompt: "How do I print Hello World in JS?",
  experimental_transform: smartQuoteTransform(),
});`}</code>
            </pre>
          </div>

          <div className={styles.codeExample}>
            <h3 className={styles.exampleLabel}>TransformStream</h3>
            <pre className={styles.codeBlock}>
              <code>{`import { smartQuoteTransform } from "smartquote";

const response = await fetch("/api/stream");
const transformed = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(smartQuoteTransform());`}</code>
            </pre>
          </div>

          <div className={styles.codeExample}>
            <h3 className={styles.exampleLabel}>AsyncIterable</h3>
            <pre className={styles.codeBlock}>
              <code>{`import { smartQuoteAsyncIterable } from "smartquote";

for await (const chunk of smartQuoteAsyncIterable(stream)) {
  process.stdout.write(chunk);
}`}</code>
            </pre>
          </div>

          <div className={styles.codeExample}>
            <h3 className={styles.exampleLabel}>ESLint plugin</h3>
            <pre className={styles.codeBlock}>
              <code>{`// eslint.config.js
import { plugin } from 'smartquote/eslint';

export default [{
  plugins: { smartquote: plugin },
  rules: { 'smartquote/smart-quotes': 'error' }
}];`}</code>
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
