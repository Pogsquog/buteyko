import { LegacySession, LogEntry, PauseType, SessionBlock } from '@/types';

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
 * Brings a stored log up to the current shape, or drops it if it is not a log
 * at all. Old entries stay readable rather than being silently discarded.
 */
export function normalizeLog(entry: unknown): LogEntry | null {
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

export function normalizeLogs(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeLog).filter((log): log is LogEntry => log !== null);
}
