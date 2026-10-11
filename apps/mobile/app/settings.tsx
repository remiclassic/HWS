import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useToast } from "../contexts/ToastContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import {
  deleteMeAccount,
  fetchGamification,
  fetchMeAccount,
  fetchMeExport,
  fetchMeSettings,
  patchLeaderboardProfile,
  patchNotificationPreferences,
  registerPushToken,
  unregisterPushTokens,
} from "../lib/api";
import { signOut } from "../lib/auth";
import { registerForExpoPushAsync } from "../lib/registerForPush";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function SettingsScreen() {
  const qc = useQueryClient();
  const { replayIntro } = useOnboarding();
  const { show: showToast, showError } = useToast();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const wideColumn = isWide
    ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
    : undefined;
  const settingsQ = useQuery({ queryKey: ["me-settings"] as const, queryFn: fetchMeSettings });
  const gamificationQ = useQuery({ queryKey: ["gamification"] as const, queryFn: fetchGamification });
  const accountQ = useQuery({ queryKey: ["me-account"] as const, queryFn: fetchMeAccount });
  const [wantPush, setWantPush] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    onError: (e) => showError("Could not update settings", e),
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
      showToast({ message: "Leaderboard settings saved" });
    },
    onError: (e) => showError("Could not save leaderboard settings", e),
  });

  const leaderboardDirty =
    gamificationQ.data != null &&
    (displayName.trim() !== (gamificationQ.data.display_name ?? "") ||
      leaderboardOptIn !== gamificationQ.data.leaderboard_opt_in);

  const onSaveLeaderboard = useCallback(() => {
    saveLeaderboard.mutate({
      display_name: displayName.trim() ? displayName.trim().slice(0, 32) : null,
      leaderboard_opt_in: leaderboardOptIn,
    });
  }, [displayName, leaderboardOptIn, saveLeaderboard]);

  const onExportData = useCallback(async () => {
    try {
      const data = await fetchMeExport();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === "web") {
        // react-native Share is a no-op on desktop browsers; write a real download.
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `hotwheels-spotter-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);
        showToast({ message: "Export downloaded" });
        return;
      }
      await Share.share({ message: json, title: "Hot Wheels Spotter export" });
    } catch (e) {
      showError("Export failed", e);
    }
  }, [showToast, showError]);

  const deleteAccountMut = useMutation({
    mutationFn: deleteMeAccount,
    onSuccess: async () => {
      await signOut();
      router.replace("/login");
      showToast({ message: "Account deleted. Your data has been removed." });
    },
    onError: (e) => showError("Could not delete account", e),
  });

  const confirmDeleteAccount = useCallback(() => setDeleteOpen(true), []);

  const onConfirmDelete = useCallback(() => {
    setDeleteOpen(false);
    deleteAccountMut.mutate();
  }, [deleteAccountMut]);

  const confirmSignOut = useCallback(() => setSignOutOpen(true), []);

  const onConfirmSignOut = useCallback(() => {
    void (async () => {
      setSigningOut(true);
      try {
        await signOut();
        setSignOutOpen(false);
        router.replace("/login");
      } catch (e) {
        showError("Sign out failed", e);
      } finally {
        setSigningOut(false);
      }
    })();
  }, [showError]);

  const lbBusy = saveLeaderboard.isPending || gamificationQ.isLoading;
  const g = gamificationQ.data;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={() => router.push("/collector-progress")}
        style={({ pressed }) => [styles.profileCard, pressed && styles.profileCardPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open collector progress"
      >
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeTxt}>{g?.level ?? "–"}</Text>
          <Text style={styles.levelBadgeLabel}>LVL</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {g?.display_name || accountQ.data?.email || "Collector"}
          </Text>
          <Text style={styles.profileMeta} numberOfLines={1}>
            {g ? `${g.total_xp} XP · ${g.achievements.length} achievements` : "Collector progress"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
      </Pressable>

      <ListGroup title="Leaderboard & public profile">
        <View style={styles.formBlock}>
          <Text style={styles.inputLabel}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Trackside Tom"
            placeholderTextColor={theme.inputPlaceholder}
            maxLength={32}
            style={styles.textInput}
            editable={!lbBusy}
            accessibilityLabel="Display name"
          />
        </View>
        <ListRow
          title="Show on leaderboard"
          subtitle={
            g?.leaderboard_slug
              ? `Public link: ${g.leaderboard_slug}`
              : "Shows your display name, level and XP — never your email."
          }
          right={
            <Switch
              value={leaderboardOptIn}
              onValueChange={setLeaderboardOptIn}
              disabled={lbBusy}
              trackColor={{ false: theme.border, true: theme.accentMuted }}
              thumbColor={leaderboardOptIn ? theme.accent : theme.bgSubtle}
              accessibilityLabel="Show on leaderboard"
            />
          }
        />
        {leaderboardDirty ? (
          <View style={styles.formBlock}>
            <PrimaryButton
              label={saveLeaderboard.isPending ? "Saving…" : "Save changes"}
              onPress={onSaveLeaderboard}
              disabled={lbBusy}
            />
          </View>
        ) : null}
      </ListGroup>

      <ListGroup title="Notifications">
        <ListRow
          icon="bell-outline"
          title="Want list alerts"
          subtitle={
            Platform.OS === "web"
              ? "Push notifications work in the iOS and Android apps."
              : "Get a push when a car on your Want list is updated."
          }
          right={
            <Switch
              value={wantPush}
              onValueChange={onToggleWant}
              disabled={savePrefs.isPending || settingsQ.isLoading}
              trackColor={{ false: theme.border, true: theme.accentMuted }}
              thumbColor={wantPush ? theme.accent : theme.bgSubtle}
              accessibilityLabel="Want list alerts"
            />
          }
        />
      </ListGroup>

      <ListGroup title="Your data">
        <ListRow
          icon="download-outline"
          title="Export my data"
          subtitle="A JSON copy of your garage and preferences."
          onPress={() => void onExportData()}
        />
      </ListGroup>

      <ListGroup title="About">
        <ListRow icon="shield-lock-outline" title="Privacy" onPress={() => router.push("/legal/privacy")} />
        <ListRow icon="file-document-outline" title="Terms of service" onPress={() => router.push("/legal/terms")} />
        <ListRow icon="play-circle-outline" title="Replay intro" onPress={() => void replayIntro()} />
      </ListGroup>

      <ListGroup title="Account">
        <ListRow
          icon="account-circle-outline"
          title={accountQ.data?.email ?? "Signed in"}
          subtitle={accountQ.data?.email ? "Signed in" : undefined}
        />
        <ListRow icon="logout" title="Sign out" onPress={confirmSignOut} />
        <ListRow
          icon="trash-can-outline"
          title={deleteAccountMut.isPending ? "Deleting…" : "Delete account"}
          subtitle="Permanently removes your profile, garage and photos."
          destructive
          disabled={deleteAccountMut.isPending}
          onPress={confirmDeleteAccount}
        />
      </ListGroup>

      <ConfirmDialog
        visible={signOutOpen}
        title="Sign out?"
        message="You'll need to sign in again to access your garage."
        confirmLabel="Sign out"
        destructive
        busy={signingOut}
        onConfirm={onConfirmSignOut}
        onCancel={() => setSignOutOpen(false)}
      />
      <ConfirmDialog
        visible={deleteOpen}
        title="Delete account?"
        message="This removes your profile, garage, and related data from the server. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={deleteAccountMut.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceLg,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    ...theme.shadow.card,
  },
  profileCardPressed: { backgroundColor: theme.bgRaised },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentYellowMuted,
    borderWidth: 2,
    borderColor: theme.trackYellow,
  },
  levelBadgeTxt: { fontSize: 20, fontWeight: "900", color: theme.trackYellow, lineHeight: 22 },
  levelBadgeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: theme.trackYellow },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 18, fontWeight: "800", color: theme.text },
  profileMeta: { marginTop: 2, fontSize: 14, fontWeight: "600", color: theme.textSecondary },
  formBlock: {
    paddingHorizontal: theme.spaceLg,
    paddingVertical: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.textMuted,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    backgroundColor: theme.bgSubtle,
  },
});
