import { SessionBlock, SessionFormat } from '@/types';

export const DEFAULT_FORMAT: SessionFormat = {
  blocks: 2,
  rbDuration: 600, // 10 minutes
  restDuration: 60, // 1 minute of regular breathing after each RB
};

export const MIN_BLOCKS = 1;
export const MAX_BLOCKS = 6;
export const MIN_RB_DURATION = 30;
export const MAX_RB_DURATION = 60 * 60;
export const MAX_REST_DURATION = 10 * 60;

/** Common RB chunk lengths, in seconds. */
export const RB_PRESETS = [300, 600, 900, 1200];
/** Common gaps between an RB chunk and the pause that follows it, in seconds. */
export const REST_PRESETS = [0, 30, 60, 120];

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

export function clampFormat(format: Partial<SessionFormat> | null | undefined): SessionFormat {
  const f = format ?? {};
  return {
    blocks: Number.isFinite(f.blocks)
      ? clampInt(f.blocks as number, MIN_BLOCKS, MAX_BLOCKS)
      : DEFAULT_FORMAT.blocks,
    rbDuration: Number.isFinite(f.rbDuration)
      ? clampInt(f.rbDuration as number, MIN_RB_DURATION, MAX_RB_DURATION)
      : DEFAULT_FORMAT.rbDuration,
    restDuration: Number.isFinite(f.restDuration)
      ? clampInt(f.restDuration as number, 0, MAX_REST_DURATION)
      : DEFAULT_FORMAT.restDuration,
  };
}

/** "45 s" / "10 min" / "7.5 min" — whichever reads more naturally. */
export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = seconds / 60;
  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded} min`;
}

/** "2 × 10 min · 1 min rest" */
export function describeFormat(format: SessionFormat): string {
  const core = `${format.blocks} × ${fmtDuration(format.rbDuration)} RB`;
  return format.restDuration > 0
    ? `${core} · ${fmtDuration(format.restDuration)} rest`
    : `${core} · no rest`;
}

/** Blank blocks for a session about to be recorded in this format. */
export function blocksForFormat(format: SessionFormat): SessionBlock[] {
  return Array.from({ length: format.blocks }, () => ({
    rbDuration: format.rbDuration,
    pauseType: 'CP' as const,
    pauseValue: 0,
  }));
}
