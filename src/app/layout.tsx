import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const SITE_DESCRIPTION =
  'Findet das günstigste gemeinsame Reiseziel für zwei Freunde aus unterschiedlichen Städten.';

// Absolute base URL so OG/Twitter image links resolve when shared.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL is auto-injected.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CheapTripFinder',
  description: SITE_DESCRIPTION,
  applicationName: 'CheapTripFinder',
  openGraph: {
    title: 'CheapTripFinder',
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'de_DE',
    siteName: 'CheapTripFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CheapTripFinder',
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#fafaf9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="de" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
