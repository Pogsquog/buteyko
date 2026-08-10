export interface Session {
  id: string;
  timestamp: number;
  initialPulse: number;
  initialCP: number;
  rb1Duration: number; // in seconds
  intermediateValue: number; // CP or EP
  intermediateType: 'CP' | 'EP';
  rb2Duration: number; // in seconds
  finalCP: number;
  finalPulse: number;
  notes: string;
}

export type LogEntry = Session;
