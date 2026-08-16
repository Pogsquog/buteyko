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

## Running

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- Lucide icons
- localStorage persistence
- PWA (production build)
