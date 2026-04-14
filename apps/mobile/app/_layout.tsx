import "react-native-reanimated";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { OnboardingNavigationGate } from "../components/navigation/OnboardingNavigationGate";
import { OnboardingProvider, useOnboarding } from "../contexts/OnboardingContext";
import { useSession } from "../lib/auth";
import { asyncStoragePersister, queryClient } from "../lib/queryClient";
import { theme } from "../lib/theme";
import { WebScrollbarStyles } from "../lib/WebScrollbarStyles";
import { initSentry } from "../lib/sentry";
import { useGarageQueueProcessor } from "../hooks/useGarageQueueProcessor";

initSentry();

function GarageSyncBootstrap({ children }: { children: React.ReactNode }) {
  useGarageQueueProcessor();
  return <>{children}</>;
}

const PUBLIC_ROUTES = new Set(["login", "signup", "forgot-password", "legal"]);

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const segments = useSegments();

  useEffect(() => {
    if (status === "loading") return;
    const top = segments[0] ?? "";
    const onPublic = PUBLIC_ROUTES.has(top);
    if (status === "unauthenticated" && !onPublic) {
      router.replace("/login");
    } else if (status === "authenticated" && (top === "login" || top === "signup" || top === "forgot-password")) {
      router.replace("/(tabs)");
    }
  }, [status, segments]);

  const ready = status !== "loading";

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Animated.View entering={FadeIn.duration(480)} style={styles.bootInner}>
          <Text style={styles.bootMark}>Hot Wheels</Text>
          <Text style={styles.bootTitle}>Spotter</Text>
          <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} size="large" />
          <Text style={styles.bootSub}>Collector field tool</Text>
        </Animated.View>
      </View>
    );
  }

  return <>{children}</>;
}

function MainStack() {
  return (
    <>
      <StatusBar style="light" />
      <WebScrollbarStyles />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.bgElevated,
          },
          headerShadowVisible: false,
          headerTintColor: theme.accent,
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 17,
            color: theme.text,
          },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="car/[id]" options={{ title: "Reference" }} />
        <Stack.Screen name="th/[id]" options={{ title: "Treasure Hunt" }} />
        <Stack.Screen name="scan" options={{ title: "Scan barcode" }} />
        <Stack.Screen name="garage-item/[id]/index" options={{ title: "Edit garage item" }} />
        <Stack.Screen name="garage-item/[id]/photo" options={{ title: "Take photo" }} />
        <Stack.Screen name="garage-insights" options={{ title: "Garage insights" }} />
        <Stack.Screen name="collector-progress" options={{ title: "Collector progress" }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
        <Stack.Screen name="collector/[slug]" options={{ title: "Collector" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="signup" options={{ title: "Create account" }} />
        <Stack.Screen name="forgot-password" options={{ title: "Reset password" }} />
        <Stack.Screen name="link-email" options={{ title: "Link email" }} />
        <Stack.Screen name="legal/privacy" options={{ title: "Privacy" }} />
        <Stack.Screen name="legal/terms" options={{ title: "Terms" }} />
      </Stack>
    </>
  );
}

function RootLayoutBody() {
  const { ready, isComplete } = useOnboarding();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Animated.View entering={FadeIn.duration(480)} style={styles.bootInner}>
          <Text style={styles.bootMark}>Hot Wheels</Text>
          <Text style={styles.bootTitle}>Spotter</Text>
          <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} size="large" />
          <Text style={styles.bootSub}>Collector field tool</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <>
      <OnboardingNavigationGate />
      {isComplete ? (
        <AuthBootstrap>
          <GarageSyncBootstrap>
            <MainStack />
          </GarageSyncBootstrap>
        </AuthBootstrap>
      ) : (
        <MainStack />
      )}
    </>
  );
}

export default function RootLayout() {
  const persistOptions = useMemo(
    () => ({
      persister: asyncStoragePersister,
      dehydrateOptions: {
        shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { status: string } }) => {
          // Never persist pending/failed queries — their rejection fires on restore.
          if (q.state.status !== "success") return false;
          const k = q.queryKey[0];
          return k === "car" || k === "garage" || k === "th" || k === "gamification";
        },
      },
    }),
    [],
  );

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <OnboardingProvider>
          <RootLayoutBody />
        </OnboardingProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
    paddingHorizontal: theme.spaceXl,
  },
  bootInner: {
    alignItems: "center",
  },
  bootMark: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  bootTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: theme.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  bootSub: {
    marginTop: 12,
    fontSize: 15,
    color: theme.textMuted,
    fontWeight: "500",
  },
});
