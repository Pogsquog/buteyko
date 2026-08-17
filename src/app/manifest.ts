import type { MetadataRoute } from 'next';

/**
 * The manifest is a GET route handler under the hood, and `output: 'export'`
 * only emits route handlers that are explicitly static.
 */
export const dynamic = 'force-static';

/**
 * As an app-directory file convention this is emitted as /manifest.webmanifest
 * *and* linked from every page automatically. The hand-written public/manifest.json
 * this replaced was never referenced by any HTML, so the app was not installable.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Buteyko Breathing Tracker',
    short_name: 'Buteyko',
    description: 'Log Buteyko breathing exercise sets against the standard worksheet.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
