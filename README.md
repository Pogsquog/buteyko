# Buteyko Breathing Tracker

A mobile-first PWA for logging Buteyko breathing exercise sets, based on the standard Buteyko worksheet format.

## What it tracks

Each session records the full exercise set sequence — by default the worksheet's
two reduced-breathing blocks:

```
P / CP / RB / CP·EP / RB / CP / P
```

| Field | Meaning |
|---|---|
| **P** | Pulse (beats per minute) |
| **CP** | Control Pause (seconds) — time before first urge to breathe |
| **RB** | Reduced Breathing (countdown) |
| **CP / EP** | Control Pause or Extended Pause (seconds) |
| **Notes** | Medication, physical condition, anything notable |

## Configuring the format

The gear icon on the home screen sets the shape of an exercise set, and the
sequence follows it:

- **Blocks** — 1 to 6 reduced-breathing chunks, each followed by a pause. The
  closing pause is always a CP; earlier ones can be CP or EP.
- **Block length** — 5 / 10 / 15 / 20 minutes, or any custom length.
- **Rest after each block** — regular breathing between an RB block and the next
  pause, so the pause is measured from a settled baseline. Defaults to 1 minute;
  can be turned off or set to any length.

Sessions logged before the format was configurable are read back unchanged.

## Timers

- Timing is taken from the wall clock rather than counted interval ticks, so a
  timer stays accurate when the screen goes off or the app is backgrounded, and
  catches up the moment it is visible again.
- The screen is held awake (where the browser supports it) while a timer runs.
- A countdown chimes and vibrates when it finishes.
- Pulse can be typed in, read from a Bluetooth heart-rate monitor, or counted
  by hand against a 15 / 30 / 60 second countdown — tap the circle on each beat
  (or type the total afterwards) and the count is scaled to beats per minute.

## Your data

Everything is kept in `localStorage` on the device, unencrypted, and never
leaves it — there is no account, no server and no analytics. That also means
there is no backup: clearing site data for this origin deletes your history.

## Running

```bash
npm install
npm run dev     # dev server on http://localhost:3000
npm test        # unit tests (vitest)
npm run lint    # eslint
npm run build   # static export to ./out
```

## Deploying

`next build` writes a static export to `out/`, which is what
[`wrangler.jsonc`](./wrangler.jsonc) serves:

```bash
npm run build
npx wrangler deploy
```

Security headers, cache policy and the no-cache rule for the service worker are
in [`public/_headers`](./public/_headers) — a static export cannot set headers
from `next.config.mjs`, so Cloudflare applies them at the edge.

## PWA

Installable and offline-capable, from a manifest and a service worker that are
both maintained by hand:

- [`src/app/manifest.ts`](./src/app/manifest.ts) — emitted as
  `/manifest.webmanifest` and linked from every page automatically.
- [`public/sw.js`](./public/sw.js) — runtime caching only, deliberately naming
  no build artefacts so it cannot go stale against a new deploy. Registered by
  `ServiceWorkerRegistrar`, in production builds only.
- Icons are generated from [`public/icon.svg`](./public/icon.svg) with
  `node scripts/generate-icons.mjs`.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- Lucide icons
- localStorage persistence
- Vitest for tests
