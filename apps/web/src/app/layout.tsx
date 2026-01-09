import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart Quotes',
  description: 'Smart quote conversion utilities for typographically correct quotes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
