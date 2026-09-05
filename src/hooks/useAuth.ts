'use client';

import { useCallback, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase, syncIsConfigured } from '@/lib/supabase/client';

export type AuthStatus =
  /** No project configured in this build; the app is local-only by design. */
  | 'unconfigured'
  /** Restoring a stored session, or exchanging a link that has just been opened. */
  | 'loading'
  | 'signedOut'
  | 'signedIn';

export interface Auth {
  status: AuthStatus;
  user: User | null;
  /** Emails a sign-in link and code. Rejects with a message fit to show the user. */
  sendLink: (email: string) => Promise<void>;
  /**
   * Signs in with the code from that email, here, in this browser.
   *
   * The link is the easy path and the code is the reliable one. On a phone the
   * link opens in whatever the mail app hands it to — on iOS never the installed
   * app and often not even the same browser — and a sign-in that lands in a
   * different browser finds an empty history there while the real one sits
   * unsigned-in. Typing the code keeps the sign-in where the readings are.
   */
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): Auth {
  const [status, setStatus] = useState<AuthStatus>(
    syncIsConfigured ? 'loading' : 'unconfigured',
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    // No client means no project in this build, which the initial state already
    // says. Nothing to subscribe to, and nothing to correct.
    if (!supabase) return;

    // Fires once on mount with the restored session — and again once the `?code=`
    // in a freshly opened magic link has been exchanged, which is why the screen
    // needs no URL parsing of its own.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session?.user ? 'signedIn' : 'signedOut');
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const sendLink = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Sync is not set up in this build.');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must match an entry in the project's redirect allowlist, or the link
        // in the email lands nowhere. `location.origin` keeps localhost working
        // in development without a second build.
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Sync is not set up in this build.');

    // 'email' covers both the first sign-in (a signup token) and every later
    // one (a magiclink token), so the screen need not know which this is.
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { status, user, sendLink, verifyCode, signOut };
}
