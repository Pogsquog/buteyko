# Buteyko Breathing Tracker

A mobile-first PWA for logging Buteyko breathing exercise sets, based on the standard Buteyko worksheet format.

## What it tracks

Each session records the full exercise set sequence:

```
P / CP / RB / CP·EP / RB / CP / P
```

| Field | Meaning |
|---|---|
| **P** | Pulse (beats per minute) |
| **CP** | Control Pause (seconds) — time before first urge to breathe |
| **RB** | Reduced Breathing (10 min countdown) |
| **CP / EP** | Control Pause or Extended Pause (seconds) |
| **Notes** | Medication, physical condition, anything notable |

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
