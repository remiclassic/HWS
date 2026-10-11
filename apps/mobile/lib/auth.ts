import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase, isLocalEnv } from "./supabase";
import { queryClient } from "./queryClient";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export function useSession(): { status: AuthStatus; session: Session | null } {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "unauthenticated");
    });
    let lastUserId: string | null | undefined = undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setStatus(s ? "authenticated" : "unauthenticated");
      // Only wipe cache when the *user identity* changes (sign-in / sign-out),
      // not on token refresh. Clearing during an in-flight query produces
      // CancelledError and persists a rejected query — noisy on the login screen.
      const nextUserId = s?.user.id ?? null;
      if (lastUserId !== undefined && lastUserId !== nextUserId) {
        void queryClient.cancelQueries();
        queryClient.removeQueries();
      }
      lastUserId = nextUserId;
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { status, session };
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signUpWithPassword(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  // With email confirmations on, session is null until the user clicks the link.
  return { needsConfirmation: !data.session };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signOut() {
  await supabase.auth.signOut();
  queryClient.clear();
}

/** Local-dev-only anonymous sign-in. Hard-disabled in release builds. */
export async function signInAnonymouslyDev() {
  if (!isLocalEnv) throw new Error("Anonymous sign-in is disabled outside local dev");
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(friendlyAuthError(error.message));
}

function friendlyAuthError(raw: string): string {
  // Supabase returns raw strings — normalize the common ones.
  if (/invalid login credentials/i.test(raw)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(raw)) return "Please confirm your email before signing in.";
  if (/user already registered/i.test(raw)) return "An account with that email already exists.";
  if (/password.*characters/i.test(raw)) return "Password does not meet the minimum requirements.";
  if (/rate limit/i.test(raw)) return "Too many attempts. Please wait a minute and try again.";
  return raw;
}
