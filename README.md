# Buteyko Breathing Tracker

A mobile-first PWA for logging Buteyko breathing exercise sets, based on the standard Buteyko worksheet format.

## What it tracks

Three kinds of entry share one history:

- **A full exercise set** — the worksheet row, below.
- **A lone CP** — one control pause on its own, optionally tied to what it was
  taken around: before or after food, talking, physical activity or anything
  else, with room to say what that was. A CP read after a flight of stairs
  means something different from one read cold.
- **A lone RB** — reduced breathing practised on its own, 10 minutes by default
  and any length you choose, on the same timer a set uses.

The home screen starts a set straight away from its **Quick Start** button; the
button at the foot of the screen opens the other three, so a single reading can
be logged without walking through a whole set.

A full set records the exercise set sequence — by default the worksheet's two
reduced-breathing blocks:

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

## History

The home screen carries the last three days, split by day, with a link through
to the full history. The history page adds a month calendar: days that have
entries are picked out and dotted once per entry, and choosing one narrows the
list to that day.

## Settings

The gear icon on the home screen opens the settings, covering both the shape of
an exercise set and how the app looks. Starting a set from the bottom menu
opens on a pre-flight card showing what the set is about to be, with the same
controls to hand — Quick Start skips it.

### Appearance

- **Light** / **Dark** — pinned, whatever the device or the hour says.
- **Match device** (the default) — follows the phone's own light/dark setting.
- **Night hours** — dark between two hours of the day, light the rest of the
  time; 20:00 to 07:00 unless you change it. The switch happens while the app
  is open, mid-session included.

The chosen theme is applied before the page is painted, so opening the app at
night never flashes white.

### The format

The shape of an exercise set, which the sequence follows:

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
- Pulse opens on a 15-second count, led in by a 5-second countdown so the phone
  can be put down first: tap the circle on each beat (or type the total
  afterwards) and the count is scaled to beats per minute. The window can be 30
  or 60 seconds instead, and the number can be typed straight in or read from a
  Bluetooth heart-rate monitor.

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
