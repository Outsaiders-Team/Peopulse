import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Peopulse',
  description:
    'Upload your form export. Peopulse sums up the long text into a short summary, clear insights, and the positive and negative things people said.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Rethink Sans isn't in the next/font/google catalog; App Router supports a plain <link> here. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Rethink+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
