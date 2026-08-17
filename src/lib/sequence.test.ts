import { describe, expect, it } from 'vitest';
import { sequenceLabels, UNDECIDED_PAUSE } from '@/lib/sequence';

describe('sequenceLabels', () => {
  it('produces the worksheet sequence for the standard two-block set', () => {
    const labels = sequenceLabels(2, (_, isLast) => (isLast ? 'CP' : UNDECIDED_PAUSE));
    expect(labels).toEqual(['P', 'CP', 'RB', 'CP/EP', 'RB', 'CP', 'P']);
  });

  it('opens with P / CP and closes with P whatever the block count', () => {
    for (const count of [1, 3, 6]) {
      const labels = sequenceLabels(count, () => 'CP');
      expect(labels.slice(0, 2)).toEqual(['P', 'CP']);
      expect(labels.at(-1)).toBe('P');
      expect(labels).toHaveLength(3 + count * 2);
    }
  });

  it('tells the caller which block is the last one', () => {
    const seen: Array<[number, boolean]> = [];
    sequenceLabels(3, (index, isLast) => {
      seen.push([index, isLast]);
      return 'CP';
    });
    expect(seen).toEqual([[0, false], [1, false], [2, true]]);
  });

  it('uses whatever label the caller gives each pause', () => {
    const recorded = ['EP', 'EP', 'CP'];
    expect(sequenceLabels(3, i => recorded[i])).toEqual(
      ['P', 'CP', 'RB', 'EP', 'RB', 'EP', 'RB', 'CP', 'P'],
    );
  });

  it('degenerates safely to just the pulses when there are no blocks', () => {
    expect(sequenceLabels(0, () => 'CP')).toEqual(['P', 'CP', 'P']);
  });
});
