import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ACHIEVEMENT_CATALOG, levelXpBounds } from "@hotwheels/shared";
import { EmptyState } from "../components/ui/EmptyState";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { Skeleton } from "../components/ui/Skeleton";
import { StatRow, StatTile } from "../components/ui/StatTile";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGamification } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function CollectorProgressScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["gamification"] as const, queryFn: fetchGamification });

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  // Unlocked first (newest on top), then what's still to earn — smallest reward first.
  const achievements = useMemo(() => {
    const unlockedAt = new Map((q.data?.achievements ?? []).map((a) => [a.id, a.unlocked_at]));
    const unlocked = ACHIEVEMENT_CATALOG.filter((a) => unlockedAt.has(a.id))
      .map((a) => ({ ...a, unlocked_at: unlockedAt.get(a.id) ?? null }))
      .sort((a, b) => new Date(b.unlocked_at ?? 0).getTime() - new Date(a.unlocked_at ?? 0).getTime());
    const locked = ACHIEVEMENT_CATALOG.filter((a) => !unlockedAt.has(a.id))
      .map((a) => ({ ...a, unlocked_at: null }))
      .sort((a, b) => a.xp - b.xp);
    return { unlocked, locked };
  }, [q.data?.achievements]);

  if (q.isLoading) {
    return (
      <View style={[styles.root, styles.content, styles.loading]} accessibilityLabel="Loading progress">
        <Skeleton height={132} radius={theme.radiusLg} />
        <Skeleton height={76} radius={theme.radiusMd} />
        <Skeleton height={220} radius={theme.radiusMd} />
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={[styles.root, styles.center]}>
        <EmptyState
          icon="cloud-off-outline"
          tone="danger"
          title="Couldn’t load your progress"
          body="Check your connection and try again."
        >
          <PrimaryButton label="Try again" onPress={() => void q.refetch()} loading={q.isFetching} />
        </EmptyState>
      </View>
    );
  }

  const g = q.data;
  const { floor, next } = levelXpBounds(g.total_xp);
  const intoLevel = Math.max(0, g.total_xp - floor);
  const span = Math.max(1, next - floor);
  const pct = Math.min(100, Math.round((intoLevel / span) * 100));
  const catalogTotal = ACHIEVEMENT_CATALOG.length;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
    >
      <View style={styles.levelCard}>
        <View style={styles.levelTop}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeNum}>{g.level}</Text>
          </View>
          <View style={styles.levelText}>
            <Text style={styles.levelTitle}>Level {g.level}</Text>
            <Text style={styles.levelSub}>
              {(next - g.total_xp).toLocaleString()} XP to level {g.level + 1}
            </Text>
          </View>
          <Text style={styles.levelXp}>{g.total_xp.toLocaleString()} XP</Text>
        </View>
        <View
          style={styles.levelTrack}
          accessibilityRole="progressbar"
          accessibilityLabel={`Progress to level ${g.level + 1}`}
          accessibilityValue={{ min: 0, max: 100, now: pct }}
        >
          <View style={[styles.levelFill, { width: `${pct}%` }]} />
        </View>
      </View>

      <View style={styles.stats}>
        <StatRow>
          <StatTile label="Day streak" value={g.current_streak} color={theme.trackOrange} />
          <StatTile label="Best streak" value={g.longest_streak} />
          <StatTile label="Scans" value={g.barcode_scan_count} />
        </StatRow>
      </View>

      <ListGroup>
        <ListRow
          icon="podium"
          title="Leaderboard"
          subtitle={g.leaderboard_opt_in ? "See where you rank" : "Opt in under Settings to appear"}
          onPress={() => router.push("/leaderboard")}
        />
        {g.leaderboard_slug ? (
          <ListRow
            divider
            icon="account-circle-outline"
            title="Your public profile"
            onPress={() => router.push(`/collector/${g.leaderboard_slug}`)}
          />
        ) : (
          <ListRow
            divider
            icon="cog-outline"
            title="Leaderboard settings"
            subtitle="Pick a display name and opt in"
            onPress={() => router.push("/settings")}
          />
        )}
      </ListGroup>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionCount}>
          {achievements.unlocked.length} of {catalogTotal}
        </Text>
      </View>
      <View style={styles.achList}>
        {[...achievements.unlocked, ...achievements.locked].map((a, i) => {
          const done = a.unlocked_at != null;
          return (
            <View
              key={a.id}
              style={[styles.achRow, i > 0 && styles.achDivider]}
              accessible
              accessibilityLabel={`${a.title}. ${a.description} ${done ? "Unlocked" : "Locked"}, ${a.xp} XP`}
            >
              <View style={[styles.achIcon, done && styles.achIconDone]}>
                <MaterialCommunityIcons
                  name={done ? "trophy" : "lock-outline"}
                  size={20}
                  color={done ? theme.trackYellow : theme.textMuted}
                />
              </View>
              <View style={styles.achText}>
                <Text style={[styles.achTitle, !done && styles.achTitleLocked]}>{a.title}</Text>
                <Text style={styles.achDesc}>{a.description}</Text>
              </View>
              <View style={styles.achRight}>
                <Text style={[styles.achXp, done && styles.achXpDone]}>+{a.xp} XP</Text>
                {a.unlocked_at ? (
                  <Text style={styles.achDate}>
                    {new Date(a.unlocked_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  loading: { gap: theme.spaceLg },
  center: { justifyContent: "center" },
  levelCard: {
    padding: theme.spaceLg,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    gap: theme.spaceLg,
  },
  levelTop: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd },
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
  levelBadgeNum: { fontSize: 24, fontWeight: "900", color: theme.trackYellow },
  levelText: { flex: 1, minWidth: 0 },
  levelTitle: { ...theme.typeTitleMd, color: theme.text },
  levelSub: { marginTop: 2, fontSize: 14, fontWeight: "500", color: theme.textSecondary },
  levelXp: { fontSize: 15, fontWeight: "800", color: theme.text, fontVariant: ["tabular-nums"] },
  levelTrack: {
    height: 10,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.bgSubtle,
    overflow: "hidden",
  },
  levelFill: { height: "100%", borderRadius: theme.radiusFull, backgroundColor: theme.trackYellow },
  stats: { marginTop: theme.spaceMd },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: theme.spaceXl,
    marginBottom: theme.spaceMd,
  },
  sectionTitle: { ...theme.typeSection, color: theme.text },
  sectionCount: { fontSize: 14, fontWeight: "700", color: theme.textMuted },
  achList: {
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  achRow: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd, padding: theme.spaceLg },
  achDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  achIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgSubtle,
  },
  achIconDone: { backgroundColor: theme.accentYellowMuted },
  achText: { flex: 1, minWidth: 0 },
  achTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  achTitleLocked: { color: theme.textSecondary },
  achDesc: { marginTop: 2, fontSize: 14, color: theme.textMuted, fontWeight: "500", lineHeight: 20 },
  achRight: { alignItems: "flex-end" },
  achXp: { fontSize: 13, fontWeight: "800", color: theme.textMuted },
  achXpDone: { color: theme.trackYellow },
  achDate: { marginTop: 2, fontSize: 12, fontWeight: "600", color: theme.textMuted },
});
