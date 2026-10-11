import { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { useToast } from "../components/ui/Toast";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { errorMessage } from "../lib/errors";
import { useOnboarding } from "../contexts/OnboardingContext";
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
  const toast = useToast();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const { replayIntro } = useOnboarding();
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
    onError: (e) => {
      // Roll the switch back so it never shows a state the server rejected
      setWantPush((v) => !v);
      toast.show({ kind: "error", message: errorMessage(e) });
    },
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
      toast.show({ message: "Leaderboard settings saved" });
    },
    onError: (e) => toast.show({ kind: "error", message: errorMessage(e) }),
  });

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
      await Share.share({ message: json, title: "Hot Wheels Spotter export" });
    } catch (e) {
      toast.show({ kind: "error", message: errorMessage(e) });
    }
  }, [toast]);

  const deleteAccountMut = useMutation({
    mutationFn: deleteMeAccount,
    onSuccess: async () => {
      await signOut();
      router.replace("/login");
      toast.show({ kind: "info", message: "Account deleted. Your data has been removed." });
    },
    onError: (e) => toast.show({ kind: "error", message: errorMessage(e) }),
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
        toast.show({ kind: "error", message: errorMessage(e) });
      } finally {
        setSigningOut(false);
      }
    })();
  }, [toast]);

  const email = accountQ.data?.email;
  const g = gamificationQ.data;
  const leaderboardDirty =
    g != null &&
    (displayName.trim() !== (g.display_name ?? "") || leaderboardOptIn !== g.leaderboard_opt_in);
  const leaderboardBusy = saveLeaderboard.isPending || gamificationQ.isLoading;
  const switchColors = { false: theme.border, true: theme.accentSecondary };
  const wideColumn = isWide
    ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
    : undefined;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>
            {(g?.display_name ?? email ?? "?").trim().charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {g?.display_name ?? email ?? "Collector"}
          </Text>
          <Text style={styles.profileSub} numberOfLines={1}>
            {g?.display_name && email ? email : "Signed in"}
          </Text>
        </View>
        {g ? (
          <View style={styles.levelPill}>
            <Text style={styles.levelPillTxt}>Lv {g.level}</Text>
          </View>
        ) : null}
      </View>

      <ListGroup>
        <ListRow
          icon="trophy-outline"
          title="Collector progress"
          subtitle="Level, streaks, and achievements"
          onPress={() => router.push("/collector-progress")}
        />
      </ListGroup>

      <ListGroup title="Account">
        <ListRow icon="logout" title="Sign out" subtitle={email ?? undefined} onPress={confirmSignOut} />
      </ListGroup>

      <ListGroup
        title="Leaderboard"
        footnote="Shows your display name, level, and XP — never your email. Turning this off removes you from the board and clears your shareable link."
      >
        <ListRow
          icon="podium"
          title="Show me on the leaderboard"
          subtitle={
            g?.leaderboard_slug
              ? `Profile link: ${g.leaderboard_slug}`
              : "A profile link is created when you opt in"
          }
          accessory={
            <Switch
              value={leaderboardOptIn}
              onValueChange={setLeaderboardOptIn}
              disabled={leaderboardBusy}
              trackColor={switchColors}
              thumbColor="#fff"
              accessibilityLabel="Show me on the leaderboard"
            />
          }
        />
        <View style={styles.groupForm}>
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Trackside Tom"
            maxLength={32}
            editable={!leaderboardBusy}
          />
          <PrimaryButton
            label="Save"
            onPress={onSaveLeaderboard}
            loading={saveLeaderboard.isPending}
            disabled={!leaderboardDirty || leaderboardBusy}
          />
        </View>
      </ListGroup>

      <ListGroup
        title="Notifications"
        footnote={
          Platform.OS === "web"
            ? "Push alerts are available in the iOS and Android apps."
            : "We’ll ping you when catalog data changes for a car on your want list."
        }
      >
        <ListRow
          icon="bell-outline"
          title="Want list alerts"
          accessory={
            <Switch
              value={wantPush}
              onValueChange={onToggleWant}
              disabled={savePrefs.isPending || settingsQ.isLoading}
              trackColor={switchColors}
              thumbColor="#fff"
              accessibilityLabel="Want list alerts"
            />
          }
        />
      </ListGroup>

      <ListGroup title="Your data">
        <ListRow
          icon="export-variant"
          title="Export my data"
          subtitle="A JSON copy of your garage and preferences"
          onPress={() => void onExportData()}
        />
        <ListRow
          divider
          icon="trash-can-outline"
          title={deleteAccountMut.isPending ? "Deleting…" : "Delete account"}
          tone="danger"
          disabled={deleteAccountMut.isPending}
          onPress={confirmDeleteAccount}
        />
      </ListGroup>

      <ListGroup title="About">
        <ListRow icon="play-circle-outline" title="Replay intro" onPress={() => void replayIntro()} />
        <ListRow
          divider
          icon="shield-lock-outline"
          title="Privacy"
          onPress={() => router.push("/legal/privacy")}
        />
        <ListRow
          divider
          icon="file-document-outline"
          title="Terms of service"
          onPress={() => router.push("/legal/terms")}
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
  profile: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
    borderWidth: 1,
    borderColor: theme.accentSecondary,
  },
  avatarTxt: { fontSize: 22, fontWeight: "900", color: theme.accentSecondary },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { ...theme.typeTitleMd, fontSize: 20, color: theme.text },
  profileSub: { marginTop: 2, fontSize: 14, fontWeight: "500", color: theme.textSecondary },
  levelPill: {
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 6,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.accentYellowMuted,
  },
  levelPillTxt: { fontSize: 13, fontWeight: "800", color: theme.trackYellow },
  groupForm: {
    padding: theme.spaceLg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
});
