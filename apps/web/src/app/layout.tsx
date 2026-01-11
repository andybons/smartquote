import type { Metadata } from 'next';
import { Fraunces, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'smartquote',
  description:
    'Smart quote conversion utilities for typographically correct quotes. ESLint plugin, streaming API, and Vercel AI SDK integration.',
  keywords: [
    'smart quotes',
    'typography',
    'eslint',
    'quotes',
    'curly quotes',
    'typographic quotes',
  ],
  authors: [{ name: 'Andy Bons' }],
  openGraph: {
    title: 'smartquote',
    description: 'Typographically correct quotes, everywhere.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
