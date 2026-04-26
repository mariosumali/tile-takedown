import type { Metadata, Viewport } from 'next';
import { Caprasimo, Fraunces } from 'next/font/google';
import DebugTerminal from '@/components/game/DebugTerminal';
import './globals.css';

const caprasimo = Caprasimo({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-body',
  axes: ['opsz'],
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tiles.mariosumali.com';
const title = 'Tile Takedown';
const description =
  'A cozy browser puzzle. Place pieces, clear rows, watch the combo stack.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s · Tile Takedown',
  },
  description,
  applicationName: title,
  keywords: [
    'puzzle',
    'block puzzle',
    'tile game',
    'browser game',
    'cozy game',
    'combo',
  ],
  authors: [{ name: 'Mario Sumali', url: 'https://mariosumali.com' }],
  creator: 'Mario Sumali',
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: title,
    title,
    description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4ecd8' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1813' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="paper"
      className={`${caprasimo.variable} ${fraunces.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="grain" aria-hidden="true" />
        <div id="main">{children}</div>
        <DebugTerminal />
      </body>
    </html>
  );
}
