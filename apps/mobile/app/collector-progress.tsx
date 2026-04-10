import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ACHIEVEMENT_CATALOG } from "@hotwheels/shared";
import { Card } from "../components/ui/Card";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGamification } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

const StatBlock = memo(function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

export default function CollectorProgressScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["gamification"] as const, queryFn: fetchGamification });

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  const catalogTotal = ACHIEVEMENT_CATALOG.length;
  const unlocked = q.data?.achievements.length ?? 0;

  const sortedAchievements = useMemo(() => {
    const list = q.data?.achievements ?? [];
    return [...list].sort(
      (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime(),
    );
  }, [q.data?.achievements]);

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading progress…</Text>
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load progress.</Text>
      </View>
    );
  }

  const g = q.data;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
    >
      <Text style={styles.kicker}>Gamification</Text>
      <Text style={styles.title}>Collector progress</Text>
      <Text style={styles.sub}>
        Level and XP sync to your account. Achievements can unlock or roll back when your garage or scan
        stats change.
      </Text>

      <View style={styles.statRow}>
        <StatBlock label="Level" value={g.level} />
        <StatBlock label="Total XP" value={g.total_xp} />
        <StatBlock label="Streak" value={g.current_streak} />
        <StatBlock label="Best streak" value={g.longest_streak} />
      </View>

      <View style={styles.statRow}>
        <StatBlock label="Barcode scans" value={g.barcode_scan_count} />
        <StatBlock label="Achievements" value={`${unlocked}/${catalogTotal}`} />
      </View>

      <View style={styles.navRow}>
        <Pressable
          onPress={() => router.push("/leaderboard")}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open leaderboard"
        >
          <MaterialCommunityIcons name="podium" size={22} color={theme.accent} />
          <Text style={styles.navBtnTxt}>Leaderboard</Text>
        </Pressable>
        {g.leaderboard_slug ? (
          <Pressable
            onPress={() => router.push(`/collector/${g.leaderboard_slug}`)}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open your public profile"
          >
            <MaterialCommunityIcons name="account-circle-outline" size={22} color={theme.accent} />
            <Text style={styles.navBtnTxt}>Public profile</Text>
          </Pressable>
        ) : null}
      </View>

      <Card title="Leaderboard & privacy" style={styles.card}>
        <Text style={styles.cardHint}>
          Choose a display name and opt in under Settings to appear on the public leaderboard. Your profile
          URL uses an anonymous slug.
        </Text>
        <Pressable onPress={() => router.push("/settings")} accessibilityRole="button">
          <Text style={styles.link}>Open settings</Text>
        </Pressable>
      </Card>

      <Card title="Achievements" style={styles.card}>
        {sortedAchievements.length === 0 ? (
          <Text style={styles.mutedSmall}>None yet — add to your garage or scan a barcode.</Text>
        ) : (
          sortedAchievements.map((a) => (
            <View key={a.id} style={styles.achRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.achTitle}>{a.title}</Text>
                <Text style={styles.achDesc}>{a.description}</Text>
              </View>
              <Text style={styles.achDate}>
                {new Date(a.unlocked_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  kicker: { ...theme.typeKicker, color: theme.accent },
  title: { ...theme.typeTitleLg, fontSize: 26, color: theme.text, marginTop: 4 },
  sub: { marginTop: 8, color: theme.textSecondary, fontSize: 15, lineHeight: 22, fontWeight: "500" },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spaceSm,
    marginTop: theme.spaceLg,
  },
  statBlock: {
    flexGrow: 1,
    minWidth: "22%",
    padding: theme.spaceMd,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "900", color: theme.text },
  statLabel: { marginTop: 4, fontSize: 12, fontWeight: "700", color: theme.textMuted },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spaceSm,
    marginTop: theme.spaceLg,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  navBtnPressed: { opacity: 0.88 },
  navBtnTxt: { fontSize: 15, fontWeight: "800", color: theme.accent },
  card: { marginTop: theme.spaceLg },
  cardHint: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: theme.spaceMd,
  },
  link: { fontSize: 16, fontWeight: "800", color: theme.accent },
  achRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceMd,
    marginBottom: theme.spaceMd,
    paddingBottom: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  achTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  achDesc: { marginTop: 4, fontSize: 14, color: theme.textSecondary, fontWeight: "500", lineHeight: 20 },
  achDate: { fontSize: 12, fontWeight: "700", color: theme.textMuted },
  muted: { color: theme.textMuted, fontWeight: "600" },
  mutedSmall: { color: theme.textMuted, fontSize: 14, fontWeight: "500" },
});
