import { useEffect } from "react";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";

/** Sends first-time users to onboarding; keeps completed users out of the onboarding stack. */
export function OnboardingNavigationGate() {
  const { ready, isComplete } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const nav = useRootNavigationState();

  useEffect(() => {
    if (!ready || !nav?.key) return;
    const root = segments[0];
    if (!isComplete && root !== "(onboarding)") {
      router.replace("/(onboarding)");
    } else if (isComplete && root === "(onboarding)") {
      router.replace("/(tabs)");
    }
  }, [ready, isComplete, segments, router, nav?.key]);

  return null;
}
