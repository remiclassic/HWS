import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { LeaderboardResponse } from "@hotwheels/shared";
import { fetchLeaderboard } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function LeaderboardScreen() {
  const q = useQuery({ queryKey: ["leaderboard"] as const, queryFn: () => fetchLeaderboard(50) });

  const renderItem = useCallback(
    ({ item }: { item: LeaderboardResponse["entries"][number] }) => (
      <Pressable
        onPress={() => router.push(`/collector/${item.leaderboard_slug}`)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.display_name}, rank ${item.rank}`}
      >
        <Text style={[styles.rank, item.is_you && styles.you]}>#{item.rank}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, item.is_you && styles.you]} numberOfLines={1}>
            {item.display_name}
            {item.is_you ? " (you)" : ""}
          </Text>
          <Text style={styles.meta}>
            Level {item.level} · {item.total_xp} XP
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    ),
    [],
  );

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading leaderboard…</Text>
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load leaderboard.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sub}>
        Collectors who opted in under Settings. Ranked by total XP (achievements + scans).
      </Text>
      {q.data.entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No one on the board yet. Be the first to opt in.</Text>
        </View>
      ) : (
        <FlatList
          {...themedScrollIndicatorProps}
          data={q.data.entries}
          keyExtractor={(i) => i.leaderboard_slug}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spaceLg },
  sub: {
    paddingHorizontal: theme.spaceLg,
    paddingTop: theme.spaceMd,
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    marginBottom: theme.spaceSm,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  rowPressed: { opacity: 0.9 },
  rank: { fontSize: 18, fontWeight: "900", color: theme.accent, minWidth: 44 },
  name: { fontSize: 17, fontWeight: "800", color: theme.text },
  meta: { marginTop: 4, fontSize: 13, color: theme.textMuted, fontWeight: "600" },
  chev: { fontSize: 22, color: theme.textMuted, fontWeight: "300" },
  you: { color: theme.accent },
  muted: { color: theme.textMuted, fontWeight: "600", textAlign: "center" },
});
