import { memo, useMemo, type ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ACHIEVEMENT_CATALOG } from "@hotwheels/shared";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGamification } from "../lib/api";
import { levelProgress } from "../lib/levelProgress";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const StatTile = memo(function StatTile({
  icon,
  color,
  value,
  label,
}: {
  icon: IconName;
  color: string;
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.statTile} accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

export default function CollectorProgressScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["gamification"] as const, queryFn: fetchGamification });

  const wideColumn = isWide
    ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
    : undefined;

  const { unlocked, locked } = useMemo(() => {
    const list = q.data?.achievements ?? [];
    const unlockedIds = new Set(list.map((a) => a.id));
    return {
      unlocked: [...list].sort(
        (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime(),
      ),
      // Cheapest first, so the next reachable badge leads the list
      locked: ACHIEVEMENT_CATALOG.filter((a) => !unlockedIds.has(a.id)).sort((a, b) => a.xp - b.xp),
    };
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
        <MaterialCommunityIcons name="cloud-off-outline" size={40} color={theme.textMuted} />
        <Text style={styles.errorTitle}>Could not load progress</Text>
        <View style={styles.centerAction}>
          <PrimaryButton label="Try again" variant="ghost" onPress={() => void q.refetch()} />
        </View>
      </View>
    );
  }

  const g = q.data;
  const lp = levelProgress(g.total_xp);
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
            <Text style={styles.levelBadgeTxt}>{g.level}</Text>
          </View>
          <View style={styles.levelText}>
            <Text style={styles.levelKicker}>Collector level</Text>
            <Text style={styles.levelTitle}>{g.total_xp.toLocaleString()} XP</Text>
          </View>
        </View>
        <View
          style={styles.xpTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: lp.xpForNextLevel, now: lp.xpIntoLevel }}
          accessibilityLabel={`${lp.xpRemaining} XP to level ${lp.level + 1}`}
        >
          <View style={[styles.xpFill, { width: `${Math.round(lp.fraction * 100)}%` }]} />
        </View>
        <Text style={styles.xpHint}>
          {lp.xpRemaining.toLocaleString()} XP to level {lp.level + 1}
        </Text>
      </View>

      <View style={styles.statRow}>
        <StatTile icon="fire" color={theme.trackOrange} value={g.current_streak} label="Day streak" />
        <StatTile icon="medal-outline" color={theme.trackYellow} value={g.longest_streak} label="Best streak" />
        <StatTile icon="barcode-scan" color={theme.accentSecondary} value={g.barcode_scan_count} label="Scans" />
      </View>

      <ListGroup>
        <ListRow icon="podium" title="Leaderboard" onPress={() => router.push("/leaderboard")} />
        {g.leaderboard_slug ? (
          <ListRow
            icon="account-circle-outline"
            title="Your public profile"
            onPress={() => router.push(`/collector/${g.leaderboard_slug}`)}
          />
        ) : (
          <ListRow
            icon="account-plus-outline"
            title="Join the leaderboard"
            subtitle="Pick a display name and opt in under Settings."
            onPress={() => router.push("/settings")}
          />
        )}
      </ListGroup>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionCount}>
          {unlocked.length} / {catalogTotal}
        </Text>
      </View>

      {unlocked.length === 0 ? (
        <Text style={styles.sectionHint}>None yet — save a car to your garage or scan a barcode to earn your first.</Text>
      ) : (
        <View style={styles.group}>
          {unlocked.map((a) => (
            <View key={a.id} style={styles.achRow}>
              <View style={[styles.achIcon, styles.achIconOn]}>
                <MaterialCommunityIcons name="trophy" size={20} color={theme.trackYellow} />
              </View>
              <View style={styles.achText}>
                <Text style={styles.achTitle}>{a.title}</Text>
                <Text style={styles.achDesc}>{a.description}</Text>
              </View>
              <Text style={styles.achAside}>
                {new Date(a.unlocked_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {locked.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Up next</Text>
          </View>
          <View style={styles.group}>
            {locked.map((a) => (
              <View key={a.id} style={styles.achRow}>
                <View style={styles.achIcon}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color={theme.textMuted} />
                </View>
                <View style={styles.achText}>
                  <Text style={[styles.achTitle, styles.achTitleLocked]}>{a.title}</Text>
                  <Text style={styles.achDesc}>{a.description}</Text>
                </View>
                <Text style={[styles.achAside, styles.achXp]}>+{a.xp} XP</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spaceXl,
    gap: theme.spaceSm,
    backgroundColor: theme.bg,
  },
  centerAction: { alignSelf: "stretch", maxWidth: 320, width: "100%", marginTop: theme.spaceMd },
  errorTitle: { fontSize: 20, fontWeight: "900", color: theme.text, textAlign: "center" },
  muted: { color: theme.textMuted, fontWeight: "600" },

  levelCard: {
    padding: theme.spaceLg,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    ...theme.shadow.card,
  },
  levelTop: { flexDirection: "row", alignItems: "center", gap: theme.spaceLg },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentYellowMuted,
    borderWidth: 2,
    borderColor: theme.trackYellow,
  },
  levelBadgeTxt: { fontSize: 28, fontWeight: "900", color: theme.trackYellow },
  levelText: { flex: 1, minWidth: 0 },
  levelKicker: { ...theme.typeKicker, color: theme.trackYellow },
  levelTitle: { ...theme.typeTitleLg, color: theme.text, marginTop: 2 },
  xpTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.bgSubtle,
    overflow: "hidden",
    marginTop: theme.spaceLg,
  },
  xpFill: { height: "100%", borderRadius: 5, backgroundColor: theme.trackYellow },
  xpHint: { marginTop: theme.spaceSm, fontSize: 13, fontWeight: "700", color: theme.textSecondary },

  statRow: { flexDirection: "row", gap: theme.spaceSm, marginTop: theme.spaceMd },
  statTile: {
    flex: 1,
    padding: theme.spaceMd,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: theme.text, marginTop: 4 },
  statLabel: { ...theme.typeKicker, fontSize: 10, color: theme.textSecondary },

  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: theme.spaceXl,
    marginBottom: theme.spaceSm,
  },
  sectionTitle: { ...theme.typeTitleMd, fontSize: 20, color: theme.text },
  sectionCount: { fontSize: 14, fontWeight: "800", color: theme.textSecondary },
  sectionHint: { fontSize: 15, lineHeight: 22, fontWeight: "500", color: theme.textMuted },
  group: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    overflow: "hidden",
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  achIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgSubtle,
    borderWidth: 1,
    borderColor: theme.border,
  },
  achIconOn: { backgroundColor: theme.accentYellowMuted, borderColor: theme.trackYellow },
  achText: { flex: 1, minWidth: 0 },
  achTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  achTitleLocked: { color: theme.textSecondary },
  achDesc: { marginTop: 2, fontSize: 13, color: theme.textMuted, fontWeight: "500", lineHeight: 18 },
  achAside: { fontSize: 12, fontWeight: "700", color: theme.textMuted },
  achXp: { color: theme.trackYellow },
});
