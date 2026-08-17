/**
 * The worksheet sequence — P / CP / (RB / pause) × n / P — is drawn in three
 * places: the settings preview, the step indicator during a session, and the
 * recorded row on a log card. They differ only in how much is known about each
 * pause yet, so that is the one thing the caller supplies.
 */

/** Shown for a pause whose type has not been settled yet. */
export const UNDECIDED_PAUSE = 'CP/EP';

/**
 * `pauseLabel` is asked for each block in turn. The pause closing the last
 * block is always a CP, so callers do not need to special-case it themselves.
 */
export function sequenceLabels(
  blockCount: number,
  pauseLabel: (index: number, isLast: boolean) => string,
): string[] {
  const blocks = Array.from({ length: blockCount }, (_, i) => [
    'RB',
    pauseLabel(i, i === blockCount - 1),
  ]).flat();
  return ['P', 'CP', ...blocks, 'P'];
}
