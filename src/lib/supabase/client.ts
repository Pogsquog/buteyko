'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser Supabase client, or `null` when the app has not been given a
 * project.
 *
 * Null is a first-class case, not an error path. The app was local-only before
 * sync existed and still is without these two variables: a fork of the repo, a
 * build with no `.env.local`, and the whole test suite all run without them,
 * and every screen must keep working. Callers check for null rather than
 * assuming a client.
 *
 * Both values are inlined into the static export at build time, which is
 * correct — the publishable key is public by design, and the row-level security
 * policy on `buteyko_log_entries` is what keeps one user's history out of
 * another's.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  // There is no localStorage while prerendering, and the client reaches for it
  // on construction to restore the session.
  if (typeof window === 'undefined' || !url || !publishableKey) {
    client = null;
    return client;
  }

  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The magic link comes back as a PKCE `?code=` on /account. This is what
      // exchanges it for a session, so no route of our own has to parse it.
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return client;
}

/** Whether this build has a project to sync with at all. */
export const syncIsConfigured = Boolean(url && publishableKey);
