export type PauseType = 'CP' | 'EP';

/** One reduced-breathing chunk plus the pause that follows it. */
export interface SessionBlock {
  rbDuration: number; // in seconds
  pauseType: PauseType;
  pauseValue: number; // in seconds
}

/** Whether a lone reading was taken before or after the activity it is paired with. */
export type ActivityRelation = 'before' | 'after';

/** The kinds of activity a CP is worth reading around. */
export type ActivityKind = 'food' | 'talking' | 'physical' | 'other';

/** What a lone CP was measured around, when the user bothered to say. */
export interface ActivityContext {
  relation: ActivityRelation;
  kind: ActivityKind;
  /** Free text — what the activity actually was. Carries "other" on its own. */
  detail: string;
}

interface EntryBase {
  id: string;
  timestamp: number;
  notes: string;
  /**
   * Device clock at the last local change. The tiebreaker when two devices have
   * both touched the same entry; `timestamp` cannot serve, because it records
   * when the reading was taken and never changes afterwards.
   */
  updatedAt: number;
  /**
   * Set when the entry is deleted locally. The entry is kept as a tombstone
   * rather than dropped, so the deletion can reach a device that was offline
   * when it happened. Hidden everywhere in the UI.
   */
  deletedAt: number | null;
}

/** A full exercise set: one row of the worksheet. */
export interface Session extends EntryBase {
  kind: 'set';
  initialPulse: number;
  initialCP: number;
  /** RB / pause pairs, in order. The last pause is the closing CP. */
  blocks: SessionBlock[];
  finalPulse: number;
}

/** A control pause taken on its own, away from a set. */
export interface CPEntry extends EntryBase {
  kind: 'cp';
  cp: number; // in seconds
  /** Null when the reading was not tied to anything in particular. */
  activity: ActivityContext | null;
}

/** Reduced breathing practised on its own. */
export interface RBEntry extends EntryBase {
  kind: 'rb';
  rbDuration: number; // in seconds
}

/** Anything the history can hold. */
export type LogEntry = Session | CPEntry | RBEntry;

/** Distributes over a union, so each member is narrowed rather than collapsed. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * An entry as the logging screens build it. The sync fields are stamped by
 * `saveLog`, not by the caller — the screens have no business deciding them,
 * and would only ever get them wrong.
 */
export type NewLogEntry = DistributiveOmit<LogEntry, 'updatedAt' | 'deletedAt'>;

export type EntryKind = LogEntry['kind'];

/** User-configurable shape of an exercise set. */
export interface SessionFormat {
  /** Number of RB chunks (each followed by a pause). */
  blocks: number;
  /** Length of each RB chunk, in seconds. */
  rbDuration: number;
  /** Regular breathing after each RB before the next pause, in seconds. 0 = off. */
  restDuration: number;
}

/** How the app decides between the light and dark palettes. */
export type ThemeMode =
  /** Always light. */
  | 'light'
  /** Always dark. */
  | 'dark'
  /** Whatever the device is set to. */
  | 'system'
  /** Dark between two hours of the day, light the rest of the time. */
  | 'schedule';

export interface ThemePreference {
  mode: ThemeMode;
  /** Hour of the day (0–23) the dark palette switches on under `schedule`. */
  fromHour: number;
  /** Hour of the day (0–23) it switches back off. */
  toHour: number;
}
