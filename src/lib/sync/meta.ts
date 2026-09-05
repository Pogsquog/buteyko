'use client';

import { createLocalStore } from '@/lib/localStore';

export interface SyncMeta {
  /**
   * The account the local history was last synced with. Null before the first
   * sign-in ever. Used to notice that a *different* person has signed in on
   * this device, which must not silently merge one history into another's.
   */
  userId: string | null;
  /** Server `updated_at` of the newest row pulled, as an ISO string. */
  cursor: string | null;
  /**
   * id → the `updatedAt` that no longer needs sending. Usually because it was
   * pushed; also because the user chose to keep an entry off this account when
   * signing in as somebody else on a shared device.
   */
  settled: Record<string, number>;
}

export const EMPTY_META: SyncMeta = { userId: null, cursor: null, settled: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Anything unreadable degrades to "nothing has been synced", which re-syncs safely. */
function parseMeta(raw: unknown): SyncMeta {
  if (!isRecord(raw)) return EMPTY_META;

  const settled: Record<string, number> = {};
  if (isRecord(raw.settled)) {
    for (const [id, at] of Object.entries(raw.settled)) {
      if (typeof at === 'number' && Number.isFinite(at)) settled[id] = at;
    }
  }

  return {
    userId: typeof raw.userId === 'string' ? raw.userId : null,
    cursor: typeof raw.cursor === 'string' ? raw.cursor : null,
    settled,
  };
}

export const metaStore = createLocalStore<SyncMeta>({
  key: 'buteyko_sync_meta',
  parse: parseMeta,
  fallback: EMPTY_META,
});
