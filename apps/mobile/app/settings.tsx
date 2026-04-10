import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Card } from "../components/ui/Card";
import {
  fetchGamification,
  fetchMeSettings,
  patchLeaderboardProfile,
  patchNotificationPreferences,
  registerPushToken,
  unregisterPushTokens,
} from "../lib/api";
import { registerForExpoPushAsync } from "../lib/registerForPush";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function SettingsScreen() {
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ["me-settings"] as const, queryFn: fetchMeSettings });
  const gamificationQ = useQuery({ queryKey: ["gamification"] as const, queryFn: fetchGamification });
  const [wantPush, setWantPush] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);

  useEffect(() => {
    if (settingsQ.data) setWantPush(settingsQ.data.notify_want_updates);
  }, [settingsQ.data]);

  useEffect(() => {
    if (gamificationQ.data) {
      setDisplayName(gamificationQ.data.display_name ?? "");
      setLeaderboardOptIn(gamificationQ.data.leaderboard_opt_in);
    }
  }, [gamificationQ.data]);

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

  const saveLeaderboard = useMutation({
    mutationFn: patchLeaderboardProfile,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      await qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e) => Alert.alert("Could not save leaderboard settings", String(e)),
  });

  const onSaveLeaderboard = useCallback(() => {
    saveLeaderboard.mutate({
      display_name: displayName.trim() ? displayName.trim().slice(0, 32) : null,
      leaderboard_opt_in: leaderboardOptIn,
    });
  }, [displayName, leaderboardOptIn, saveLeaderboard]);

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.kicker}>Preferences</Text>
      <Text style={styles.title}>Settings</Text>

      <Pressable
        onPress={() => router.push("/collector-progress")}
        style={styles.progressLink}
        accessibilityRole="button"
        accessibilityLabel="Open collector progress"
      >
        <Text style={styles.progressLinkTxt}>Collector progress & achievements</Text>
      </Pressable>

      <Card title="Leaderboard & public profile" style={styles.card}>
        <Text style={styles.hint}>
          Opt in to appear on the public leaderboard. We show a display name, level, and XP — not your email
          or device id. Turning this off removes you from the board and clears your shareable link.
        </Text>
        <Text style={styles.inputLabel}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Trackside Tom"
          placeholderTextColor={theme.textMuted}
          maxLength={32}
          style={styles.textInput}
          editable={!saveLeaderboard.isPending && !gamificationQ.isLoading}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Show on leaderboard</Text>
            <Text style={styles.rowSub}>
              {gamificationQ.data?.leaderboard_slug
                ? `Slug: ${gamificationQ.data.leaderboard_slug}`
                : "A random slug is created when you opt in."}
            </Text>
          </View>
          <Switch
            value={leaderboardOptIn}
            onValueChange={setLeaderboardOptIn}
            disabled={saveLeaderboard.isPending || gamificationQ.isLoading}
            trackColor={{ false: theme.border, true: theme.accentMuted }}
            thumbColor={leaderboardOptIn ? theme.accent : theme.bgSubtle}
          />
        </View>
        <Pressable
          onPress={onSaveLeaderboard}
          disabled={saveLeaderboard.isPending || gamificationQ.isLoading}
          style={({ pressed }) => [
            styles.saveLbBtn,
            (saveLeaderboard.isPending || gamificationQ.isLoading) && styles.saveLbBtnDisabled,
            pressed && !saveLeaderboard.isPending && styles.saveLbBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save leaderboard settings"
        >
          <Text style={styles.saveLbBtnTxt}>
            {saveLeaderboard.isPending ? "Saving…" : "Save leaderboard settings"}
          </Text>
        </Pressable>
      </Card>

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
  progressLink: {
    marginTop: theme.spaceMd,
    paddingVertical: theme.spaceSm,
  },
  progressLinkTxt: { fontSize: 16, fontWeight: "800", color: theme.accent },
  card: { marginTop: theme.spaceLg },
  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.textMuted,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    backgroundColor: theme.bgSubtle,
    marginBottom: theme.spaceMd,
  },
  saveLbBtn: {
    marginTop: theme.spaceMd,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.accent,
    alignItems: "center",
  },
  saveLbBtnPressed: { opacity: 0.92 },
  saveLbBtnDisabled: { opacity: 0.55 },
  saveLbBtnTxt: { fontSize: 16, fontWeight: "800", color: theme.bg },
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
