import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { fetchPublicCollectorProfile } from "../../lib/api";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

export default function PublicCollectorScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug: string }>();
  const slug = useMemo(() => (typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? ""), [slugParam]);

  const q = useQuery({
    queryKey: ["collector-profile", slug] as const,
    queryFn: () => fetchPublicCollectorProfile(slug),
    enabled: slug.length > 0,
  });

  if (!slug) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Invalid profile link.</Text>
      </View>
    );
  }

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Profile not found or not public.</Text>
      </View>
    );
  }

  const p = q.data;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.kicker}>Public collector</Text>
      <Text style={styles.title}>{p.display_name}</Text>
      <Text style={styles.slug}>@{p.leaderboard_slug}</Text>

      <View style={styles.statRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{p.leaderboard_rank != null ? `#${p.leaderboard_rank}` : "—"}</Text>
          <Text style={styles.statLabel}>Leaderboard rank</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{p.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{p.total_xp}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </View>

      <Card title="Stats" style={styles.card}>
        <Text style={styles.rowLine}>
          <Text style={styles.rowLabel}>Current streak </Text>
          <Text style={styles.rowValue}>{p.current_streak} days</Text>
        </Text>
        <Text style={styles.rowLine}>
          <Text style={styles.rowLabel}>Achievements unlocked </Text>
          <Text style={styles.rowValue}>{p.achievement_count}</Text>
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg, padding: theme.spaceLg },
  kicker: { ...theme.typeKicker, color: theme.accent },
  title: { ...theme.typeTitleLg, fontSize: 26, color: theme.text, marginTop: 4 },
  slug: { marginTop: 6, fontSize: 15, fontWeight: "700", color: theme.textMuted },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spaceSm,
    marginTop: theme.spaceLg,
  },
  statBlock: {
    flexGrow: 1,
    minWidth: "28%",
    padding: theme.spaceMd,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "900", color: theme.text },
  statLabel: { marginTop: 4, fontSize: 11, fontWeight: "700", color: theme.textMuted, textAlign: "center" },
  card: { marginTop: theme.spaceLg },
  rowLine: { marginBottom: theme.spaceSm, fontSize: 15, lineHeight: 22 },
  rowLabel: { color: theme.textSecondary, fontWeight: "600" },
  rowValue: { color: theme.text, fontWeight: "800" },
  muted: { color: theme.textMuted, fontWeight: "600", textAlign: "center" },
});
