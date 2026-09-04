import { describe, expect, it } from 'vitest';
import { describeActivity } from '@/lib/activity';

describe('describeActivity', () => {
  it('reads as prose against the relation', () => {
    expect(describeActivity({ relation: 'after', kind: 'food', detail: '' })).toBe('after food');
    expect(describeActivity({ relation: 'before', kind: 'talking', detail: '' })).toBe('before talking');
  });

  it('qualifies a named activity with what it actually was', () => {
    expect(describeActivity({ relation: 'after', kind: 'physical', detail: 'stairs' })).toBe(
      'after physical (stairs)',
    );
  });

  it('lets a typed activity stand in for "other" entirely', () => {
    expect(describeActivity({ relation: 'before', kind: 'other', detail: 'a cold shower' })).toBe(
      'before a cold shower',
    );
  });

  it('still says something for an "other" nobody described', () => {
    expect(describeActivity({ relation: 'after', kind: 'other', detail: '  ' })).toBe(
      'after something else',
    );
  });
});
