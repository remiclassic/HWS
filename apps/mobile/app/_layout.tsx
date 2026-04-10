import "react-native-reanimated";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { authAnonymous } from "../lib/api";
import { setToken, getToken } from "../lib/authStorage";
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

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getToken();
        if (!existing) {
          const { token } = await authAnonymous();
          if (!cancelled) await setToken(token);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

export default function RootLayout() {
  const persistOptions = useMemo(
    () => ({
      persister: asyncStoragePersister,
      dehydrateOptions: {
        shouldDehydrateQuery: (q: { queryKey: readonly unknown[] }) => {
          const k = q.queryKey[0];
          return k === "car" || k === "garage" || k === "th";
        },
      },
    }),
    [],
  );

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthBootstrap>
          <GarageSyncBootstrap>
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
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="car/[id]" options={{ title: "Reference" }} />
              <Stack.Screen name="th/[id]" options={{ title: "Treasure Hunt" }} />
              <Stack.Screen name="scan" options={{ title: "Scan barcode" }} />
              <Stack.Screen name="garage-item/[id]" options={{ title: "Edit garage item" }} />
              <Stack.Screen name="garage-item/[id]/photo" options={{ title: "Take photo" }} />
              <Stack.Screen name="garage-insights" options={{ title: "Garage insights" }} />
              <Stack.Screen name="settings" options={{ title: "Settings" }} />
            </Stack>
          </GarageSyncBootstrap>
        </AuthBootstrap>
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
