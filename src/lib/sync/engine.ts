'use client';

import { SupabaseClient } from '@supabase/supabase-js';
import { LogEntry } from '@/types';
import { logStore } from '@/hooks/useLogs';
import { EntryRow, fromRow, toRow } from '@/lib/sync/row';
import { mergeEntries, pendingEntries } from '@/lib/sync/merge';
import { metaStore } from '@/lib/sync/meta';

export const TABLE = 'buteyko_log_entries';

/** Upserted per request. Large enough to make the round trip worth it, small
 *  enough that a slow connection is not asked to hold a huge body open. */
const PUSH_BATCH = 200;
const PULL_PAGE = 500;

export interface SyncOutcome {
  pushed: number;
  pulled: number;
}

/**
 * Sends what this device owes, then takes what it is missing.
 *
 * Push first, deliberately. If the two ever disagree the merge settles it by
 * `updatedAt`, so ordering cannot lose an entry — but pushing first means a
 * reading taken seconds ago is durable before anything else can go wrong.
 *
 * Throws on network or database failure. The caller shows that; nothing local
 * is touched on the way out, so a failed sync leaves the device exactly as it
 * was and the next attempt starts over from the same place.
 */
export async function syncNow(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncOutcome> {
  const pushed = await push(supabase, userId);
  const pulled = await pull(supabase, userId);
  return { pushed, pulled };
}

async function push(supabase: SupabaseClient, userId: string): Promise<number> {
  const meta = metaStore.get();
  const pending = pendingEntries(logStore.get(), meta.settled);
  if (pending.length === 0) return 0;

  for (let i = 0; i < pending.length; i += PUSH_BATCH) {
    const batch = pending.slice(i, i + PUSH_BATCH);
    const { error } = await supabase
      .from(TABLE)
      .upsert(batch.map(entry => toRow(entry, userId)), { onConflict: 'user_id,id' });
    if (error) throw new Error(error.message);

    // Recorded per batch rather than at the end, so a failure halfway through a
    // long first upload does not make the next attempt repeat the whole thing.
    await metaStore.update(current => ({
      ...current,
      settled: Object.fromEntries([
        ...Object.entries(current.settled),
        ...batch.map(entry => [entry.id, entry.updatedAt] as const),
      ]),
    }));
  }

  return pending.length;
}

async function pull(supabase: SupabaseClient, userId: string): Promise<number> {
  const { cursor } = metaStore.get();
  const rows: EntryRow[] = [];

  for (let offset = 0; ; offset += PULL_PAGE) {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      // Ordered by the server clock and broken by id, so paging by offset within
      // one run is stable even when a batch of rows shares a timestamp.
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PULL_PAGE - 1);
    // `>=`, not `>`: rows written in the same instant would otherwise be skipped.
    // Re-seeing a row costs nothing, because the merge is idempotent.
    if (cursor) query = query.gte('updated_at', cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    rows.push(...(data as EntryRow[]));
    if (data.length < PULL_PAGE) break;
  }

  if (rows.length === 0) return 0;

  const remote = rows
    .map(fromRow)
    .filter((entry): entry is LogEntry => entry !== null);

  await logStore.update(local => mergeEntries(local, remote));

  // Everything just pulled is by definition already on the server, at the
  // version we now hold. Recording that here stops the next push echoing the
  // whole pull straight back.
  const newest = rows.reduce<string | null>(
    (max, row) => (row.updated_at && (!max || row.updated_at > max) ? row.updated_at : max),
    null,
  );
  await metaStore.update(current => ({
    ...current,
    cursor: newest ?? current.cursor,
    settled: Object.fromEntries([
      ...Object.entries(current.settled),
      ...remote.map(entry => [entry.id, entry.updatedAt] as const),
    ]),
  }));

  return remote.length;
}

/**
 * Forgets what has been synced without touching a single entry.
 *
 * Called on sign-out and when a different account signs in. The history stays
 * on the device — this app has never deleted a user's readings and must not
 * start now — but it is no longer considered to be anybody's copy, so the next
 * sign-in re-establishes the relationship from scratch.
 */
export async function forgetSyncState(): Promise<void> {
  await metaStore.update(() => ({ userId: null, cursor: null, settled: {} }));
}

/** Marks the local history as belonging to this account, so sync can begin. */
export async function claimFor(userId: string): Promise<void> {
  await metaStore.update(current => ({ ...current, userId }));
}

/**
 * Claims the account but leaves the entries already on this device out of it.
 *
 * For the shared-device case: somebody else signs in here, and their account
 * must not silently absorb the previous person's history. The entries stay
 * exactly where they are — nothing is deleted, this app does not delete
 * readings — they are simply recorded as settled, so no push will carry them.
 */
export async function claimWithoutLocal(userId: string, local: LogEntry[]): Promise<void> {
  await metaStore.update(current => ({
    ...current,
    userId,
    settled: Object.fromEntries([
      ...Object.entries(current.settled),
      ...local.map(entry => [entry.id, entry.updatedAt] as const),
    ]),
  }));
}
