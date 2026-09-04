import { ActivityContext, ActivityKind, ActivityRelation } from '@/types';

export const ACTIVITY_KINDS: Array<{ value: ActivityKind; label: string; hint: string }> = [
  { value: 'food', label: 'Food', hint: 'a meal or a snack' },
  { value: 'talking', label: 'Talking', hint: 'a call, a meeting' },
  { value: 'physical', label: 'Physical', hint: 'exercise, stairs, a walk' },
  { value: 'other', label: 'Other', hint: 'anything else' },
];

export const ACTIVITY_RELATIONS: Array<{ value: ActivityRelation; label: string }> = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
];

const labelFor = (kind: ActivityKind) =>
  ACTIVITY_KINDS.find(option => option.value === kind)?.label ?? kind;

/**
 * "after food" / "before talking (team call)". A named activity says more than
 * the bare category, so where one was typed it stands in for "other" entirely
 * and qualifies the rest.
 */
export function describeActivity({ relation, kind, detail }: ActivityContext): string {
  const trimmed = detail.trim();
  if (kind === 'other') return `${relation} ${trimmed || 'something else'}`;
  return trimmed ? `${relation} ${labelFor(kind).toLowerCase()} (${trimmed})` : `${relation} ${labelFor(kind).toLowerCase()}`;
}
