import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { getOnboardingComplete, setOnboardingComplete } from "../lib/onboardingStorage";

type OnboardingContextValue = {
  ready: boolean;
  isComplete: boolean;
  completeIntro: () => Promise<void>;
  replayIntro: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const done = await getOnboardingComplete();
      if (!cancelled) {
        setIsComplete(done);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeIntro = useCallback(async () => {
    await setOnboardingComplete(true);
    setIsComplete(true);
    router.replace("/(tabs)");
  }, [router]);

  const replayIntro = useCallback(async () => {
    await setOnboardingComplete(false);
    setIsComplete(false);
    router.replace("/(onboarding)");
  }, [router]);

  const value = useMemo(
    () => ({ ready, isComplete, completeIntro, replayIntro }),
    [ready, isComplete, completeIntro, replayIntro],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
