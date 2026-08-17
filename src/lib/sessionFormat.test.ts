import { describe, expect, it } from 'vitest';
import {
  blocksForFormat,
  clampFormat,
  DEFAULT_FORMAT,
  describeFormat,
  MAX_BLOCKS,
  MAX_RB_DURATION,
  MAX_REST_DURATION,
  MIN_BLOCKS,
  MIN_RB_DURATION,
} from '@/lib/sessionFormat';

describe('clampFormat', () => {
  it('keeps a format that is already in range', () => {
    const format = { blocks: 3, rbDuration: 900, restDuration: 30 };
    expect(clampFormat(format)).toEqual(format);
  });

  it('pulls out-of-range values back to the limits', () => {
    expect(clampFormat({ blocks: 99, rbDuration: 99999, restDuration: 99999 })).toEqual({
      blocks: MAX_BLOCKS,
      rbDuration: MAX_RB_DURATION,
      restDuration: MAX_REST_DURATION,
    });

    expect(clampFormat({ blocks: -4, rbDuration: 1, restDuration: -30 })).toEqual({
      blocks: MIN_BLOCKS,
      rbDuration: MIN_RB_DURATION,
      restDuration: 0,
    });
  });

  it('allows a rest of zero, which means no rest rather than "unset"', () => {
    expect(clampFormat({ ...DEFAULT_FORMAT, restDuration: 0 }).restDuration).toBe(0);
  });

  it('rounds fractional values to whole seconds', () => {
    expect(clampFormat({ blocks: 2.6, rbDuration: 300.4, restDuration: 45.5 })).toEqual({
      blocks: 3,
      rbDuration: 300,
      restDuration: 46,
    });
  });

  it('falls back to the default for anything unusable', () => {
    expect(clampFormat(null)).toEqual(DEFAULT_FORMAT);
    expect(clampFormat(undefined)).toEqual(DEFAULT_FORMAT);
    expect(clampFormat('nonsense')).toEqual(DEFAULT_FORMAT);
    expect(clampFormat({})).toEqual(DEFAULT_FORMAT);
    expect(clampFormat({ blocks: Number.NaN, rbDuration: Infinity })).toEqual(DEFAULT_FORMAT);
  });
});

describe('describeFormat', () => {
  it('describes a format with a rest', () => {
    expect(describeFormat({ blocks: 2, rbDuration: 600, restDuration: 60 }))
      .toBe('2 × 10 min RB · 1 min rest');
  });

  it('says so when the rest is off', () => {
    expect(describeFormat({ blocks: 1, rbDuration: 300, restDuration: 0 }))
      .toBe('1 × 5 min RB · no rest');
  });
});

describe('blocksForFormat', () => {
  it('makes one blank CP block per configured block', () => {
    expect(blocksForFormat({ blocks: 3, rbDuration: 300, restDuration: 0 })).toEqual([
      { rbDuration: 300, pauseType: 'CP', pauseValue: 0 },
      { rbDuration: 300, pauseType: 'CP', pauseValue: 0 },
      { rbDuration: 300, pauseType: 'CP', pauseValue: 0 },
    ]);
  });

  it('gives each block its own object, so editing one does not edit the rest', () => {
    const blocks = blocksForFormat(DEFAULT_FORMAT);
    blocks[0].pauseValue = 25;
    expect(blocks[1].pauseValue).toBe(0);
  });
});
