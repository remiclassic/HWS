import { useEffect } from "react";
import { router } from "expo-router";

// Anonymous → email linking is now a supabase.auth.updateUser({ email }) flow, handled
// on the settings screen once implemented. Redirect to signup for any stale deep links.
export default function LinkEmailScreen() {
  useEffect(() => {
    router.replace("/signup");
  }, []);
  return null;
}
