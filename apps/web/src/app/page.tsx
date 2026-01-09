import { smartQuotes } from 'smartquote';

export default function Home() {
  const example = smartQuotes('"Hello," she said. "It\'s a beautiful day!"');

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Smart Quotes</h1>
      <p>Smart quote conversion utilities for typographically correct quotes.</p>

      <h2>Example</h2>
      <p>
        <strong>Input:</strong> {`"Hello," she said. "It's a beautiful day!"`}
      </p>
      <p>
        <strong>Output:</strong> {example}
      </p>
    </main>
  );
}
