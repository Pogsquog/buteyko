'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker. next-pwa used to inject this, via a webpack
 * hook that Turbopack builds never run — so nothing registered anything and
 * the app had no offline support at all.
 *
 * Renders nothing; it exists purely for the effect.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      // updateViaCache: 'none' so the worker script itself is always revalidated;
      // otherwise an HTTP-cached sw.js can pin an old worker for its max-age.
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(e => console.error('Service worker registration failed', e));
  }, []);

  return null;
}
