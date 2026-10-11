import { useMemo, type ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { fetchPublicCollectorProfile } from "../../lib/api";
import { levelProgress } from "../../lib/levelProgress";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function StatTile({ icon, color, value, label }: { icon: IconName; color: string; value: string; label: string }) {
  return (
    <View style={styles.statTile} accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PublicCollectorScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug: string }>();
  const slug = useMemo(() => (typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? ""), [slugParam]);
  const { isWide, contentMaxWidth } = useResponsiveLayout();

  const q = useQuery({
    queryKey: ["collector-profile", slug] as const,
    queryFn: () => fetchPublicCollectorProfile(slug),
    enabled: slug.length > 0,
  });

  if (q.isLoading && slug) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  if (!slug || q.isError || !q.data) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="account-off-outline" size={40} color={theme.textMuted} />
        <Text style={styles.emptyTitle}>Profile not available</Text>
        <Text style={styles.muted}>This collector isn’t public, or the link is wrong.</Text>
        <View style={styles.centerAction}>
          <PrimaryButton label="Open leaderboard" variant="ghost" onPress={() => router.replace("/leaderboard")} />
        </View>
      </View>
    );
  }

  const p = q.data;
  const lp = levelProgress(p.total_xp);
  const wideColumn = isWide
    ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
    : undefined;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
    >
      <View style={styles.hero}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeTxt}>{p.level}</Text>
          <Text style={styles.levelBadgeLabel}>LVL</Text>
        </View>
        <Text style={styles.name}>{p.display_name}</Text>
        <Text style={styles.slug}>@{p.leaderboard_slug}</Text>
        <View
          style={styles.xpTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: lp.xpForNextLevel, now: lp.xpIntoLevel }}
        >
          <View style={[styles.xpFill, { width: `${Math.round(lp.fraction * 100)}%` }]} />
        </View>
        <Text style={styles.xpHint}>
          {p.total_xp.toLocaleString()} XP · {lp.xpRemaining.toLocaleString()} to level {lp.level + 1}
        </Text>
      </View>

      <View style={styles.statRow}>
        <StatTile
          icon="podium"
          color={theme.accentSecondary}
          value={p.leaderboard_rank != null ? `#${p.leaderboard_rank}` : "—"}
          label="Rank"
        />
        <StatTile icon="fire" color={theme.trackOrange} value={String(p.current_streak)} label="Day streak" />
        <StatTile icon="trophy" color={theme.trackYellow} value={String(p.achievement_count)} label="Badges" />
      </View>
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
    backgroundColor: theme.bg,
    padding: theme.spaceXl,
    gap: theme.spaceSm,
  },
  centerAction: { alignSelf: "stretch", maxWidth: 320, width: "100%", marginTop: theme.spaceMd },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: theme.text, textAlign: "center" },
  muted: { color: theme.textMuted, fontWeight: "600", textAlign: "center", fontSize: 15, lineHeight: 22 },

  hero: {
    alignItems: "center",
    padding: theme.spaceXl,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    ...theme.shadow.card,
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentYellowMuted,
    borderWidth: 2,
    borderColor: theme.trackYellow,
  },
  levelBadgeTxt: { fontSize: 30, fontWeight: "900", color: theme.trackYellow, lineHeight: 32 },
  levelBadgeLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: theme.trackYellow },
  name: { ...theme.typeTitleLg, fontSize: 26, color: theme.text, marginTop: theme.spaceMd, textAlign: "center" },
  slug: { marginTop: 2, fontSize: 14, fontWeight: "700", color: theme.textMuted },
  xpTrack: {
    alignSelf: "stretch",
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
});
