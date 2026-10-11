import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { LineType, UserCarDto, UserCarStatus } from "@hotwheels/shared";
import { HuntBadge } from "../components/ui/HuntBadge";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { RemoteImage } from "../components/ui/RemoteImage";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGarage } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

const LINE_LABELS: Record<LineType, string> = {
  Mainline: "Mainline",
  Premium: "Premium",
  RLC: "RLC",
  TeamTransport: "Team Transport",
  Entertainment: "Entertainment",
  Other: "Other",
};

const StatTile = memo(function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statTile} accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

/** Horizontal bar scaled against the largest value in its group. */
const BarRow = memo(function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <View style={styles.barRow} accessibilityLabel={`${label}: ${count}`}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barCount}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
});

export default function GarageInsightsScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });

  const { total, byStatus, byLine, byYear, wantList } = useMemo(() => {
    const items = q.data?.items ?? [];
    const statusCount: Record<UserCarStatus, number> = { Owned: 0, Want: 0, Duplicate: 0 };
    const lineCount: Partial<Record<LineType, number>> = {};
    const yearCount: Record<number, number> = {};
    const wants: UserCarDto[] = [];

    for (const it of items) {
      statusCount[it.status] += 1;
      const line = it.car?.line_type;
      if (line) lineCount[line] = (lineCount[line] ?? 0) + 1;
      const y = it.car?.year;
      if (typeof y === "number") yearCount[y] = (yearCount[y] ?? 0) + 1;
      if (it.status === "Want") wants.push(it);
    }

    return {
      total: items.length,
      byStatus: statusCount,
      byLine: (Object.entries(lineCount) as [LineType, number][]).sort((a, b) => b[1] - a[1]).slice(0, 8),
      byYear: Object.entries(yearCount)
        .map(([y, c]) => ({ year: Number(y), count: c }))
        .sort((a, b) => b.count - a.count || b.year - a.year)
        .slice(0, 8),
      wantList: wants,
    };
  }, [q.data?.items]);

  const wideColumn = isWide
    ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
    : undefined;

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading garage…</Text>
      </View>
    );
  }

  if (total === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyArt}>
          <MaterialCommunityIcons name="chart-box-outline" size={44} color={theme.accentSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No insights yet</Text>
        <Text style={styles.emptyBody}>Save a few cars to your garage and the breakdown appears here.</Text>
        <View style={styles.centerAction}>
          <PrimaryButton label="Browse catalog" onPress={() => router.push("/")} />
        </View>
      </View>
    );
  }

  const lineMax = byLine[0]?.[1] ?? 0;
  const yearMax = byYear[0]?.count ?? 0;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
    >
      <View style={styles.statRow}>
        <StatTile label="Total" value={total} color={theme.text} />
        <StatTile label="Owned" value={byStatus.Owned} color={theme.officialText} />
        <StatTile label="Want" value={byStatus.Want} color={theme.rlcText} />
        <StatTile label="Dupes" value={byStatus.Duplicate} color={theme.communityText} />
      </View>

      <Text style={styles.sectionTitle}>By line</Text>
      <View style={styles.group}>
        {byLine.map(([line, count]) => (
          <BarRow key={line} label={LINE_LABELS[line]} count={count} max={lineMax} color={theme.accentSecondary} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Top years</Text>
      <View style={styles.group}>
        {byYear.map(({ year, count }) => (
          <BarRow key={year} label={String(year)} count={count} max={yearMax} color={theme.trackOrange} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Want list</Text>
      {wantList.length === 0 ? (
        <Text style={styles.sectionHint}>Nothing on your want list. Mark a car as “Want” when you save it.</Text>
      ) : (
        <View style={styles.listGroup}>
          {wantList.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => router.push(`/car/${it.car_id}`)}
              style={({ pressed }) => [styles.wantRow, pressed && styles.wantRowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open reference: ${it.car?.casting_name ?? "Car"}`}
            >
              <RemoteImage uri={it.car?.primary_image_url} style={styles.wantThumb} />
              <View style={styles.wantText}>
                <Text style={styles.wantTitle} numberOfLines={1}>
                  {it.car?.casting_name ?? "Car"}
                </Text>
                {it.car ? (
                  <Text style={styles.wantMeta} numberOfLines={1}>
                    {it.car.year} · {LINE_LABELS[it.car.line_type]}
                  </Text>
                ) : null}
              </View>
              {it.car ? <HuntBadge type={it.car.treasure_hunt_type} /> : null}
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
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
  emptyArt: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
    marginBottom: theme.spaceSm,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: theme.text, textAlign: "center" },
  emptyBody: {
    color: theme.textSecondary,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    maxWidth: 340,
  },
  muted: { color: theme.textMuted, fontWeight: "600" },

  statRow: { flexDirection: "row", gap: theme.spaceSm },
  statTile: {
    flex: 1,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceSm,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  statLabel: { ...theme.typeKicker, fontSize: 10, color: theme.textSecondary, marginTop: 2 },

  sectionTitle: {
    ...theme.typeTitleMd,
    fontSize: 20,
    color: theme.text,
    marginTop: theme.spaceXl,
    marginBottom: theme.spaceSm,
  },
  sectionHint: { fontSize: 15, lineHeight: 22, fontWeight: "500", color: theme.textMuted },
  group: {
    padding: theme.spaceLg,
    gap: theme.spaceMd,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  barRow: { gap: 6 },
  barHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: theme.spaceMd },
  barLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.text },
  barCount: { fontSize: 15, fontWeight: "900", color: theme.text },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: theme.bgSubtle, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },

  listGroup: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    overflow: "hidden",
  },
  wantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  wantRowPressed: { backgroundColor: theme.bgRaised },
  wantThumb: { width: 64, height: 48, borderRadius: theme.radiusSm, backgroundColor: theme.bgSubtle },
  wantText: { flex: 1, minWidth: 0 },
  wantTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  wantMeta: { marginTop: 2, fontSize: 13, fontWeight: "600", color: theme.textSecondary },
});
