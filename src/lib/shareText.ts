import { Session } from '@/types';

/** RB in minutes, to one decimal where it is not whole: 600 → "10", 450 → "7.5". */
const rbMinutes = (seconds: number) => String(Math.round((seconds / 60) * 10) / 10);

/**
 * A set as the one line people post to share their results:
 * pulse / CP / RB (min) / CP·EP / RB (min) / CP / pulse — "72 / 25 / 10 / 32 / 10 / 35 / 68".
 * Bare numbers, because that is the form the community already reads.
 */
export function setShareText(session: Session): string {
  return [
    String(session.initialPulse),
    String(session.initialCP),
    ...session.blocks.flatMap(block => [rbMinutes(block.rbDuration), String(block.pauseValue)]),
    String(session.finalPulse),
  ].join(' / ');
}
