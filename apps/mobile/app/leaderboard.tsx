import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { LeaderboardResponse } from "@hotwheels/shared";
import { EmptyState } from "../components/ui/EmptyState";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { Skeleton } from "../components/ui/Skeleton";
import { fetchLeaderboard } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

/** Gold / silver / bronze for the podium */
const MEDAL: Record<number, string> = { 1: theme.trackYellow, 2: theme.chromeHighlight, 3: theme.trackOrange };

export default function LeaderboardScreen() {
  const q = useQuery({ queryKey: ["leaderboard"] as const, queryFn: () => fetchLeaderboard(50) });

  const renderItem = useCallback(
    ({ item }: { item: LeaderboardResponse["entries"][number] }) => {
      const medal = MEDAL[item.rank];
      return (
        <Pressable
          onPress={() => router.push(`/collector/${item.leaderboard_slug}`)}
          style={({ pressed }) => [styles.row, item.is_you && styles.rowYou, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Rank ${item.rank}, ${item.display_name}${item.is_you ? ", you" : ""}, level ${item.level}, ${item.total_xp} XP`}
        >
          <View style={[styles.rank, medal ? { borderColor: medal } : null]}>
            <Text style={[styles.rankTxt, medal ? { color: medal } : null]}>{item.rank}</Text>
          </View>
          <View style={styles.text}>
            <View style={styles.nameLine}>
              <Text style={styles.name} numberOfLines={1}>
                {item.display_name}
              </Text>
              {item.is_you ? (
                <View style={styles.youPill}>
                  <Text style={styles.youTxt}>You</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>Level {item.level}</Text>
          </View>
          <Text style={styles.xp}>{item.total_xp.toLocaleString()} XP</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
        </Pressable>
      );
    },
    [],
  );

  if (q.isLoading) {
    return (
      <View style={[styles.root, styles.list, styles.loading]} accessibilityLabel="Loading leaderboard">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={64} radius={theme.radiusMd} />
        ))}
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={[styles.root, styles.center]}>
        <EmptyState
          icon="cloud-off-outline"
          tone="danger"
          title="Couldn’t load the leaderboard"
          body="Check your connection and try again."
        >
          <PrimaryButton label="Try again" onPress={() => void q.refetch()} loading={q.isFetching} />
        </EmptyState>
      </View>
    );
  }

  if (q.data.entries.length === 0) {
    return (
      <View style={[styles.root, styles.center]}>
        <EmptyState
          icon="podium"
          title="No one’s on the board yet"
          body="Be the first — pick a display name and opt in under Settings."
        >
          <PrimaryButton label="Open settings" onPress={() => router.push("/settings")} />
        </EmptyState>
      </View>
    );
  }

  return (
    <FlatList
      {...themedScrollIndicatorProps}
      style={styles.root}
      data={q.data.entries}
      keyExtractor={(i) => i.leaderboard_slug}
      renderItem={renderItem}
      ListHeaderComponent={
        <Text style={styles.sub}>Collectors who opted in, ranked by total XP.</Text>
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: {
    padding: theme.spaceLg,
    paddingBottom: theme.space3xl,
    width: "100%",
    maxWidth: theme.contentMaxWidthPhoneFirst,
    alignSelf: "center",
  },
  loading: { gap: theme.spaceSm },
  center: { justifyContent: "center" },
  sub: {
    marginBottom: theme.spaceLg,
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minHeight: 64,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    marginBottom: theme.spaceSm,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  rowYou: { borderWidth: 1, borderColor: theme.accentSecondary, backgroundColor: theme.bgRaised },
  rowPressed: { opacity: 0.85 },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  rankTxt: { fontSize: 15, fontWeight: "900", color: theme.textSecondary, fontVariant: ["tabular-nums"] },
  text: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "800", color: theme.text },
  youPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.accentSecondaryMuted,
  },
  youTxt: { fontSize: 11, fontWeight: "800", color: theme.accentSecondary },
  meta: { marginTop: 2, fontSize: 13, color: theme.textMuted, fontWeight: "600" },
  xp: { fontSize: 14, fontWeight: "800", color: theme.text, fontVariant: ["tabular-nums"] },
});
