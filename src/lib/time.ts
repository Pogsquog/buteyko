/**
 * Durations show up in three different registers in this app, so each one gets
 * its own name rather than a single `fmtDuration` that means something
 * different depending on where it is called from.
 */

/** Ticking clock face: "9:05". Used by the running timer. */
export function fmtClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

/** Prose, for settings and summaries: "45 s" / "10 min" / "7.5 min". */
export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = seconds / 60;
  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded} min`;
}

/** Compact, for the worksheet grid where the column is a few characters wide. */
export function fmtCompact(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  if (minutes === 0) return `${rest}s`;
  return rest === 0 ? `${minutes}m` : `${minutes}:${rest.toString().padStart(2, '0')}`;
}

/** A pause, always read in seconds: "21s". */
export function fmtSeconds(seconds: number): string {
  return `${seconds}s`;
}
