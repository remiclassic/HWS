import { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { LineType, UserCarDto, UserCarStatus } from "@hotwheels/shared";
import { Card } from "../components/ui/Card";
import { HuntBadge } from "../components/ui/HuntBadge";
import { LineChip } from "../components/ui/LineChip";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGarage } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

const StatBlock = memo(function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

export default function GarageInsightsScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });

  const items = q.data?.items ?? [];

  const { byStatus, byLine, byYear, wantList } = useMemo(() => {
    const statusCount: Record<UserCarStatus, number> = {
      Owned: 0,
      Want: 0,
      Duplicate: 0,
    };
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

    const topYears = Object.entries(yearCount)
      .map(([y, c]) => ({ year: Number(y), count: c }))
      .sort((a, b) => b.count - a.count || b.year - a.year)
      .slice(0, 8);

    const topLines = (Object.entries(lineCount) as [LineType, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      byStatus: statusCount,
      byLine: topLines,
      byYear: topYears,
      wantList: wants,
    };
  }, [items]);

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading garage…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
    >
      <Text style={styles.kicker}>At a glance</Text>
      <Text style={styles.title}>Garage insights</Text>
      <Text style={styles.sub}>Derived from your saved items on this device.</Text>

      <View style={styles.statRow}>
        <StatBlock label="Total" value={items.length} />
        <StatBlock label="Owned" value={byStatus.Owned} />
        <StatBlock label="Want" value={byStatus.Want} />
        <StatBlock label="Dupes" value={byStatus.Duplicate} />
      </View>

      <Card title="By line" style={styles.card}>
        {byLine.length === 0 ? (
          <Text style={styles.mutedSmall}>No line data yet.</Text>
        ) : (
          byLine.map(([line, count]) => (
            <View key={line} style={styles.rowLine}>
              <LineChip line={line} />
              <Text style={styles.rowCount}>{count}</Text>
            </View>
          ))
        )}
      </Card>

      <Card title="Top years" style={styles.card}>
        {byYear.length === 0 ? (
          <Text style={styles.mutedSmall}>No year data yet.</Text>
        ) : (
          byYear.map(({ year, count }) => (
            <View key={year} style={styles.rowYear}>
              <Text style={styles.yearTxt}>{year}</Text>
              <Text style={styles.rowCount}>{count}</Text>
            </View>
          ))
        )}
      </Card>

      <Card title="Want list" style={styles.card}>
        {wantList.length === 0 ? (
          <Text style={styles.mutedSmall}>Nothing on your want list.</Text>
        ) : (
          wantList.map((it) => (
            <View key={it.id} style={styles.wantRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.wantTitle} numberOfLines={2}>
                  {it.car?.casting_name ?? "Car"}
                </Text>
                {it.car ? (
                  <View style={styles.wantChips}>
                    <LineChip line={it.car.line_type} />
                    <HuntBadge type={it.car.treasure_hunt_type} />
                  </View>
                ) : null}
              </View>
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
  card: { marginTop: theme.spaceLg },
  rowLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spaceSm,
    gap: theme.spaceMd,
  },
  rowYear: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spaceSm,
  },
  yearTxt: { fontSize: 16, fontWeight: "800", color: theme.text },
  rowCount: { fontSize: 16, fontWeight: "800", color: theme.accent },
  wantRow: { marginBottom: theme.spaceMd, paddingBottom: theme.spaceMd, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  wantTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  wantChips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginTop: theme.spaceSm },
  muted: { color: theme.textMuted, fontWeight: "600" },
  mutedSmall: { color: theme.textMuted, fontSize: 14, fontWeight: "500" },
});
