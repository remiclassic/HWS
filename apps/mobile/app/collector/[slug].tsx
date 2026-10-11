import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListGroup, ListRow } from "../../components/ui/ListRow";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatRow, StatTile } from "../../components/ui/StatTile";
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

  if (q.isLoading) {
    return (
      <View style={[styles.root, styles.content, styles.loading]} accessibilityLabel="Loading profile">
        <Skeleton height={72} radius={theme.radiusMd} />
        <Skeleton height={76} radius={theme.radiusMd} />
        <Skeleton height={112} radius={theme.radiusMd} />
      </View>
    );
  }

  if (!slug || q.isError || !q.data) {
    return (
      <View style={[styles.root, styles.center]}>
        <EmptyState
          icon="account-off-outline"
          title="Profile not available"
          body="This collector hasn’t made their profile public, or the link is out of date."
        >
          <PrimaryButton label="Go back" variant="ghost" onPress={() => router.back()} />
        </EmptyState>
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
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{p.display_name.trim().charAt(0).toUpperCase() || "?"}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
            {p.display_name}
          </Text>
          <Text style={styles.slug} numberOfLines={1}>
            @{p.leaderboard_slug}
          </Text>
        </View>
      </View>

      <StatRow>
        {p.leaderboard_rank != null ? (
          <StatTile label="Rank" value={`#${p.leaderboard_rank}`} color={theme.trackYellow} />
        ) : null}
        <StatTile label="Level" value={p.level} />
        <StatTile label="XP" value={p.total_xp.toLocaleString()} />
      </StatRow>

      <ListGroup>
        <ListRow
          icon="fire"
          title="Current streak"
          accessory={<Text style={styles.value}>{p.current_streak} days</Text>}
        />
        <ListRow
          divider
          icon="trophy-outline"
          title="Achievements unlocked"
          accessory={<Text style={styles.value}>{p.achievement_count}</Text>}
        />
      </ListGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: {
    padding: theme.spaceLg,
    paddingBottom: theme.space3xl,
    width: "100%",
    maxWidth: theme.contentMaxWidthPhoneFirst,
    alignSelf: "center",
  },
  loading: { gap: theme.spaceLg },
  center: { justifyContent: "center" },
  profile: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd, marginBottom: theme.spaceLg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
    borderWidth: 1,
    borderColor: theme.accentSecondary,
  },
  avatarTxt: { fontSize: 26, fontWeight: "900", color: theme.accentSecondary },
  profileText: { flex: 1, minWidth: 0 },
  title: { ...theme.typeTitleMd, color: theme.text },
  slug: { marginTop: 2, fontSize: 14, fontWeight: "600", color: theme.textMuted },
  value: { fontSize: 15, fontWeight: "800", color: theme.text },
});
