import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Card } from "../components/ui/Card";
import {
  fetchMeSettings,
  patchNotificationPreferences,
  registerPushToken,
  unregisterPushTokens,
} from "../lib/api";
import { registerForExpoPushAsync } from "../lib/registerForPush";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function SettingsScreen() {
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ["me-settings"] as const, queryFn: fetchMeSettings });
  const [wantPush, setWantPush] = useState(true);

  useEffect(() => {
    if (settingsQ.data) setWantPush(settingsQ.data.notify_want_updates);
  }, [settingsQ.data]);

  const savePrefs = useMutation({
    mutationFn: async (next: boolean) => {
      await patchNotificationPreferences({ notify_want_updates: next });
      if (next) {
        if (Platform.OS === "web") return;
        const token = await registerForExpoPushAsync();
        if (token) {
          await registerPushToken({
            expo_push_token: token,
            platform: Platform.OS === "ios" ? "ios" : "android",
          });
        }
      } else {
        await unregisterPushTokens();
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me-settings"] });
    },
    onError: (e) => Alert.alert("Could not update settings", String(e)),
  });

  const onToggleWant = useCallback(
    (value: boolean) => {
      setWantPush(value);
      savePrefs.mutate(value);
    },
    [savePrefs],
  );

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.kicker}>Preferences</Text>
      <Text style={styles.title}>Settings</Text>

      <Card title="Want list alerts" style={styles.card}>
        <Text style={styles.hint}>
          When catalog data is refreshed for a car on your Want list, we can send a push notification
          (requires Expo push credentials on the server).
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Notify on catalog updates</Text>
            <Text style={styles.rowSub}>Uses your anonymous account on this device.</Text>
          </View>
          <Switch
            value={wantPush}
            onValueChange={onToggleWant}
            disabled={savePrefs.isPending || settingsQ.isLoading}
            trackColor={{ false: theme.border, true: theme.accentMuted }}
            thumbColor={wantPush ? theme.accent : theme.bgSubtle}
          />
        </View>
        {Platform.OS === "web" ? (
          <Text style={styles.webNote}>Push registration applies on iOS and Android builds only.</Text>
        ) : null}
      </Card>

      <Card title="Tips" style={styles.card}>
        <Text style={styles.hint}>
          Set EXPO_ACCESS_TOKEN on the API host to enable outbound push. Pair the app with an EAS project
          ID so this device can obtain an Expo push token.
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close settings">
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  kicker: { ...theme.typeKicker, color: theme.accent },
  title: { ...theme.typeTitleLg, fontSize: 26, color: theme.text, marginTop: 4 },
  card: { marginTop: theme.spaceLg },
  hint: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: theme.spaceMd,
  },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd },
  rowTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  rowSub: { fontSize: 13, color: theme.textMuted, marginTop: 4, fontWeight: "500" },
  webNote: { marginTop: theme.spaceMd, fontSize: 13, color: theme.textSecondary, fontWeight: "600" },
  link: {
    marginTop: theme.spaceMd,
    fontSize: 16,
    fontWeight: "800",
    color: theme.accent,
  },
});
