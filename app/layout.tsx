import type { Metadata, Viewport } from 'next';
import { Caprasimo, Fraunces } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'Tile Takedown',
  description:
    'A cozy browser puzzle. Place pieces, clear rows, watch the combo stack.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tile Takedown',
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
      </body>
    </html>
  );
}
