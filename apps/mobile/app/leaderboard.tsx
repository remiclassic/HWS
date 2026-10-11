import { useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { LeaderboardResponse } from "@hotwheels/shared";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchLeaderboard } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

type Entry = LeaderboardResponse["entries"][number];

/** Gold / silver / bronze for the top three ranks. */
const MEDAL_COLORS: Record<number, string> = {
  1: theme.trackYellow,
  2: theme.chromeHighlight,
  3: theme.trackOrange,
};

export default function LeaderboardScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["leaderboard"] as const, queryFn: () => fetchLeaderboard(50) });

  const wideColumn = useMemo(
    () =>
      isWide ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const } : undefined,
    [isWide, contentMaxWidth],
  );

  const you = q.data?.entries.find((e) => e.is_you);

  const renderItem = useCallback(({ item }: { item: Entry }) => {
    const medal = MEDAL_COLORS[item.rank];
    return (
      <Pressable
        onPress={() => router.push(`/collector/${item.leaderboard_slug}`)}
        style={({ pressed }) => [
          styles.row,
          medal != null && { borderColor: medal + "66" },
          item.is_you && styles.rowYou,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.display_name}${item.is_you ? " (you)" : ""}, rank ${item.rank}, level ${item.level}, ${item.total_xp} XP`}
      >
        <View style={[styles.rankBadge, medal != null && { backgroundColor: medal + "22", borderColor: medal }]}>
          {medal != null ? (
            <MaterialCommunityIcons name="trophy" size={18} color={medal} />
          ) : (
            <Text style={styles.rankTxt}>{item.rank}</Text>
          )}
        </View>
        <View style={styles.rowText}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.display_name}
            </Text>
            {item.is_you ? (
              <View style={styles.youTag}>
                <Text style={styles.youTagTxt}>YOU</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>Level {item.level}</Text>
        </View>
        <View style={styles.xpBlock}>
          <Text style={[styles.xp, medal != null && { color: medal }]}>{item.total_xp.toLocaleString()}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </Pressable>
    );
  }, []);

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
        <MaterialCommunityIcons name="cloud-off-outline" size={40} color={theme.textMuted} />
        <Text style={styles.emptyTitle}>Could not load the leaderboard</Text>
        <View style={styles.centerAction}>
          <PrimaryButton label="Try again" variant="ghost" onPress={() => void q.refetch()} />
        </View>
      </View>
    );
  }

  if (q.data.entries.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyArt}>
          <MaterialCommunityIcons name="podium" size={44} color={theme.trackYellow} />
        </View>
        <Text style={styles.emptyTitle}>No one on the board yet</Text>
        <Text style={styles.muted}>Opt in under Settings to claim the first spot.</Text>
        <View style={styles.centerAction}>
          <PrimaryButton label="Open settings" onPress={() => router.push("/settings")} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        {...themedScrollIndicatorProps}
        data={q.data.entries}
        keyExtractor={(i) => i.leaderboard_slug}
        renderItem={renderItem}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        contentContainerStyle={[styles.list, wideColumn]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.sub}>Ranked by total XP from achievements and scans.</Text>
            {you ? null : (
              <Pressable
                onPress={() => router.push("/settings")}
                style={({ pressed }) => [styles.joinBanner, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel="Join the leaderboard in settings"
              >
                <MaterialCommunityIcons name="account-plus-outline" size={22} color={theme.accentSecondary} />
                <Text style={styles.joinTxt}>You’re not on the board. Opt in under Settings.</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spaceXl,
    gap: theme.spaceSm,
    backgroundColor: theme.bg,
  },
  centerAction: { alignSelf: "stretch", maxWidth: 320, width: "100%", marginTop: theme.spaceMd },
  emptyArt: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentYellowMuted,
    marginBottom: theme.spaceSm,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: theme.text, textAlign: "center" },
  header: { marginBottom: theme.spaceMd, gap: theme.spaceMd },
  sub: { color: theme.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  joinBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.accentSecondaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.accentSecondary,
  },
  joinTxt: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "700", color: theme.text },
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
  rowYou: { backgroundColor: theme.bgRaised, borderColor: theme.accentSecondary, borderWidth: 1 },
  rowPressed: { opacity: 0.85 },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgSubtle,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rankTxt: { fontSize: 15, fontWeight: "900", color: theme.textSecondary },
  rowText: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "800", color: theme.text },
  youTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.accentSecondaryMuted,
  },
  youTagTxt: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6, color: theme.accentSecondary },
  meta: { marginTop: 2, fontSize: 13, color: theme.textMuted, fontWeight: "600" },
  xpBlock: { alignItems: "flex-end" },
  xp: { fontSize: 17, fontWeight: "900", color: theme.text },
  xpLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: theme.textMuted },
  muted: { color: theme.textMuted, fontWeight: "600", textAlign: "center", fontSize: 15, lineHeight: 22 },
});
