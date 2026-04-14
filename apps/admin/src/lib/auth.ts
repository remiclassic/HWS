import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "not-admin"; email: string | null }
  | { status: "admin"; userId: string; email: string | null };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    async function resolve() {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        if (mounted) setState({ status: "unauthenticated" });
        return;
      }
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("user_id", userRes.user.id)
        .single();
      if (!mounted) return;
      if (prof?.is_admin) {
        setState({ status: "admin", userId: userRes.user.id, email: userRes.user.email ?? null });
      } else {
        setState({ status: "not-admin", email: userRes.user.email ?? null });
      }
    }

    void resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setState({ status: "loading" });
      void resolve();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
