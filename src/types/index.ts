export type PauseType = 'CP' | 'EP';

/** One reduced-breathing chunk plus the pause that follows it. */
export interface SessionBlock {
  rbDuration: number; // in seconds
  pauseType: PauseType;
  pauseValue: number; // in seconds
}

export interface Session {
  id: string;
  timestamp: number;
  initialPulse: number;
  initialCP: number;
  /** RB / pause pairs, in order. The last pause is the closing CP. */
  blocks: SessionBlock[];
  finalPulse: number;
  notes: string;
}

export type LogEntry = Session;

/** Shape written before the exercise-set format became configurable. */
export interface LegacySession {
  id: string;
  timestamp: number;
  initialPulse: number;
  initialCP: number;
  rb1Duration: number;
  intermediateValue: number;
  intermediateType: PauseType;
  rb2Duration: number;
  finalCP: number;
  finalPulse: number;
  notes: string;
}

/** User-configurable shape of an exercise set. */
export interface SessionFormat {
  /** Number of RB chunks (each followed by a pause). */
  blocks: number;
  /** Length of each RB chunk, in seconds. */
  rbDuration: number;
  /** Regular breathing after each RB before the next pause, in seconds. 0 = off. */
  restDuration: number;
}
