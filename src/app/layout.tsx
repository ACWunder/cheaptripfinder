import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CheapTripFinder',
  description: 'Finde günstige Reiseziele, die zwei Freunde aus unterschiedlichen Städten erreichen können.',
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
