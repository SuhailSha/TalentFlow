import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { Providers } from '@/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Recruitment Platform',
    template: '%s | Recruitment Platform',
  },
  description: 'Multi-tenant Recruitment & Vendor Management Platform for staffing companies.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout — Server Component.
 *
 * Responsibilities:
 *   1. Set the HTML shell with lang, suppressHydrationWarning (required by next-themes)
 *   2. Load the Inter font via next/font (self-hosted, zero layout shift)
 *   3. Mount the client-side provider tree
 *
 * next-themes sets a class on <html> to enable dark mode. suppressHydrationWarning
 * silences the inevitable server/client mismatch on the class attribute.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
