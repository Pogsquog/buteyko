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

Everything is kept in `localStorage` on the device, unencrypted. There is no
analytics, and signed out there is still no account and no server: the app
behaves exactly as it always has, and clearing site data for this origin
deletes your history.

Sync (Settings → Sync) changes only that last part. Enter an email, type the
code it sends, and your readings are copied to a Supabase project as well as
kept on the device — so they survive a cleared browser and appear on any other
device you sign in from. There is no password to choose or forget; the emailed
code is the sign-in. The email carries a link too, but it only helps if it opens
in the same browser as the app — on a phone it usually does not, and a sign-in
that lands in a different browser finds no readings there, while the ones on
the device stay unsigned-in. The code has no such problem.

The device stays in charge. localStorage remains the store the app reads and
writes, so everything works offline exactly as before and readings taken with
no connection upload themselves when one returns. Signing out stops the syncing
and touches nothing on the device.

Deleting a reading marks it deleted rather than dropping it, and the marker is
kept for 90 days — long enough for the deletion to reach a device that was
switched off when you made it.

Settings → Sync also has **Download** and **Restore**, which need no account and
no network. Download writes the whole history to a dated JSON file; Restore reads
one back and *merges* it with what is already on the device — an entry in the
file that is not here is added, and where both hold the same one the more
recently changed wins. It cannot overwrite or delete a reading. The file carries
deletion markers too, so restoring an old backup does not resurrect readings you
removed after taking it.

### Setting up sync

Sync is off unless the build is given a project. Copy `.env.example` to
`.env.local` and fill in the two values from the Supabase dashboard
(Project Settings → API); with them unset the app builds and runs local-only.

The project needs, under Authentication → URL Configuration:

- **Site URL** set to the deployed origin — if it is left at `http://localhost:3000`,
  every link the app emails will land there instead.
- `<origin>/account` and `http://localhost:3000/account` in the **redirect
  allowlist**, which is where the link returns to.

And under Authentication → Email Templates, the **Magic Link** and **Confirm
signup** templates must include `{{ .Token }}` — that is the code the app asks
for. The default templates carry only the link.

The table is `public.buteyko_log_entries`, with row-level security allowing each
user only their own rows. The publishable key is inlined into the static export,
which is what it is for — that policy is what protects the data, not the key.

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
- localStorage persistence, mirrored to Supabase when signed in
- Vitest for tests
