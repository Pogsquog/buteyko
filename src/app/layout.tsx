import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { ThemeController } from '@/components/ThemeController';
import { THEME_COLORS } from '@/lib/theme';
import { THEME_SCRIPT } from '@/lib/themeScript';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Buteyko',
  description: 'Buteyko breathing exercise tracker',
  appleWebApp: {
    capable: true,
    title: 'Buteyko',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  // The starting value only; the theme layer repaints it to match the palette
  // in force, so the browser and PWA chrome follow the app into the dark.
  themeColor: THEME_COLORS.light,
  // The app is a column of controls; letting it be zoomed out or in is fine,
  // but it must not be scaled to fit a desktop-width viewport on a phone.
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline script below sets the theme class on this element before
      // the first paint, which React then sees as a mismatch against the HTML
      // it rendered. That is the point of the script, so the diff is expected.
      suppressHydrationWarning
    >
      <head>
        {/* Ahead of any paint: no flash of the light palette on a dark night. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeController />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
