import {
  ActivityContext,
  ActivityKind,
  ActivityRelation,
  CPEntry,
  LogEntry,
  PauseType,
  RBEntry,
  Session,
  SessionBlock,
} from '@/types';

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
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const pauseType = (value: unknown): PauseType => (value === 'EP' ? 'EP' : 'CP');

const ACTIVITY_KINDS: ActivityKind[] = ['food', 'talking', 'physical', 'other'];

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

/** Anything unrecognisable becomes "no context" rather than a half-filled one. */
function normalizeActivity(value: unknown): ActivityContext | null {
  if (!isRecord(value)) return null;
  const kind = ACTIVITY_KINDS.includes(value.kind as ActivityKind)
    ? (value.kind as ActivityKind)
    : null;
  if (kind === null) return null;
  return {
    relation: (value.relation === 'before' ? 'before' : 'after') as ActivityRelation,
    kind,
    detail: str(value.detail),
  };
}

/** The fields every entry carries, whatever its kind. */
interface EntryBaseFields {
  id: string;
  timestamp: number;
  notes: string;
  updatedAt: number;
  deletedAt: number | null;
}

function readSet(entry: Record<string, unknown>, base: EntryBaseFields): Session {
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
    ...base,
    kind: 'set',
    initialPulse: num(entry.initialPulse),
    initialCP: num(entry.initialCP),
    blocks,
    finalPulse: num(entry.finalPulse),
  };
}

/**
 * Brings a stored entry up to the current shape, or drops it if it is not an
 * entry at all. Old entries stay readable rather than being silently
 * discarded — including the full sets written before lone CP and RB readings
 * existed, which carried no `kind` at all.
 */
export function normalizeEntry(entry: unknown): LogEntry | null {
  if (!isRecord(entry)) return null;
  // Finite, not merely numeric: NaN and Infinity are numbers too, and a
  // non-finite timestamp renders as an invalid date downstream.
  if (typeof entry.id !== 'string' || typeof entry.timestamp !== 'number' || !Number.isFinite(entry.timestamp))
    return null;

  // Entries written before sync existed carry neither field. `updatedAt` falls back
  // to the moment the reading was taken, which is the only honest answer and orders
  // correctly against anything edited since; `deletedAt` to "not deleted". So every
  // entry already in localStorage migrates on read, with nothing rewritten.
  const base: EntryBaseFields = {
    id: entry.id,
    timestamp: entry.timestamp,
    notes: str(entry.notes),
    updatedAt:
      typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt)
        ? entry.updatedAt
        : entry.timestamp,
    deletedAt:
      typeof entry.deletedAt === 'number' && Number.isFinite(entry.deletedAt)
        ? entry.deletedAt
        : null,
  };

  if (entry.kind === 'cp') {
    const cp: CPEntry = { ...base, kind: 'cp', cp: num(entry.cp), activity: normalizeActivity(entry.activity) };
    return cp;
  }
  if (entry.kind === 'rb') {
    const rb: RBEntry = { ...base, kind: 'rb', rbDuration: num(entry.rbDuration) };
    return rb;
  }
  return readSet(entry, base);
}

/**
 * How long a tombstone is kept before it is forgotten. Long enough that a device
 * left in a drawer for a season still learns about the deletion when it wakes;
 * short enough that deleting a lot of history eventually reclaims the space.
 */
export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function normalizeEntries(raw: unknown, now = Date.now()): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(entry => normalizeEntry(entry))
    .filter((e): e is LogEntry => e !== null)
    .filter(e => e.deletedAt === null || now - e.deletedAt < TOMBSTONE_TTL_MS);
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
