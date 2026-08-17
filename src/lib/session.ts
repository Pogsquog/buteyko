import { PauseType, Session, SessionBlock } from '@/types';

/** Shape written before the exercise-set format became configurable. */
interface LegacySession {
  rb1Duration: number;
  intermediateValue: number;
  intermediateType: PauseType;
  rb2Duration: number;
  finalCP: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const pauseType = (value: unknown): PauseType => (value === 'EP' ? 'EP' : 'CP');

/** Fixed two-block sessions were stored with named fields before the format became configurable. */
function isLegacy(entry: Record<string, unknown>): boolean {
  return !Array.isArray(entry.blocks) && typeof entry.rb1Duration === 'number';
}

function legacyBlocks(entry: LegacySession): SessionBlock[] {
  return [
    {
      rbDuration: num(entry.rb1Duration),
      pauseType: pauseType(entry.intermediateType),
      pauseValue: num(entry.intermediateValue),
    },
    {
      rbDuration: num(entry.rb2Duration),
      pauseType: 'CP',
      pauseValue: num(entry.finalCP),
    },
  ];
}

/**
 * Brings a stored session up to the current shape, or drops it if it is not a
 * session at all. Old entries stay readable rather than being silently
 * discarded.
 */
export function normalizeSession(entry: unknown): Session | null {
  if (!isRecord(entry)) return null;
  if (typeof entry.id !== 'string' || typeof entry.timestamp !== 'number') return null;

  const blocks = isLegacy(entry)
    ? legacyBlocks(entry as unknown as LegacySession)
    : Array.isArray(entry.blocks)
      ? entry.blocks.filter(isRecord).map(b => ({
          rbDuration: num(b.rbDuration),
          pauseType: pauseType(b.pauseType),
          pauseValue: num(b.pauseValue),
        }))
      : [];

  return {
    id: entry.id,
    timestamp: entry.timestamp,
    initialPulse: num(entry.initialPulse),
    initialCP: num(entry.initialCP),
    blocks,
    finalPulse: num(entry.finalPulse),
    notes: typeof entry.notes === 'string' ? entry.notes : '',
  };
}

export function normalizeSessions(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSession).filter((s): s is Session => s !== null);
}

/**
 * Collision-proof, unlike the `Date.now()` this used to use: two sessions saved
 * inside the same millisecond would have shared an id, and deleting one would
 * have taken the other with it.
 */
export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
