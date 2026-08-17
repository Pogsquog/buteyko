/**
 * The PWA is hand-rolled (app/manifest.ts + public/sw.js, registered by
 * ServiceWorkerRegistrar) rather than plugin-generated. next-pwa hooks in
 * through `config.webpack`, which Turbopack builds — the default since Next 16
 * — never call, so it silently produced nothing.
 *
 * `output: 'export'` means headers cannot be set here; they live in
 * public/_headers, which Cloudflare applies to the deployed assets.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  output: 'export',
};

export default nextConfig;
