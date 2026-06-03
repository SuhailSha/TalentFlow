import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { Providers } from '@/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Inter Display is the same family as Inter but ships with optical sizing
// tuned for headlines. We load it as a separate CSS variable so display
// utilities (`text-display-xl`, etc.) can opt in.
const interDisplay = Inter({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-inter-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TalentFlow',
    template: '%s · TalentFlow',
  },
  description: 'TalentFlow — Recruitment, vendor management, and resume intelligence for staffing teams.',
  applicationName: 'TalentFlow',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)',  color: '#0B1020' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
