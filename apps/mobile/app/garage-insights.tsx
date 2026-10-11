import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { LineType, UserCarDto, UserCarStatus } from "@hotwheels/shared";
import { BarRow } from "../components/ui/BarRow";
import { Card } from "../components/ui/Card";
import { CarRow } from "../components/ui/CarRow";
import { EmptyState } from "../components/ui/EmptyState";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { Skeleton } from "../components/ui/Skeleton";
import { StatRow, StatTile } from "../components/ui/StatTile";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGarage } from "../lib/api";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

const LINE_LABEL: Record<LineType, string> = {
  Mainline: "Mainline",
  Premium: "Premium",
  RLC: "RLC",
  TeamTransport: "Team Transport",
  Entertainment: "Entertainment",
  Other: "Other",
};

export default function GarageInsightsScreen() {
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const q = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);

  const { byStatus, byLine, byYear, wantList, hunts } = useMemo(() => {
    const statusCount: Record<UserCarStatus, number> = {
      Owned: 0,
      Want: 0,
      Duplicate: 0,
    };
    const lineCount: Partial<Record<LineType, number>> = {};
    const yearCount: Record<number, number> = {};
    const wants: UserCarDto[] = [];
    let huntCount = 0;

    for (const it of items) {
      statusCount[it.status] += 1;
      const line = it.car?.line_type;
      if (line) lineCount[line] = (lineCount[line] ?? 0) + 1;
      const y = it.car?.year;
      if (typeof y === "number") yearCount[y] = (yearCount[y] ?? 0) + 1;
      if (it.status === "Want") wants.push(it);
      else if (it.car && it.car.treasure_hunt_type !== "None") huntCount += 1;
    }

    const topYears = Object.entries(yearCount)
      .map(([y, c]) => ({ year: Number(y), count: c }))
      .sort((a, b) => b.count - a.count || b.year - a.year)
      .slice(0, 6);

    const topLines = (Object.entries(lineCount) as [LineType, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      byStatus: statusCount,
      byLine: topLines,
      byYear: topYears,
      wantList: wants,
      hunts: huntCount,
    };
  }, [items]);

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  if (q.isLoading) {
    return (
      <View style={[styles.root, styles.content, styles.loading]} accessibilityLabel="Loading insights">
        <Skeleton height={76} radius={theme.radiusMd} />
        <Skeleton height={180} radius={theme.radiusMd} />
        <Skeleton height={180} radius={theme.radiusMd} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.root, styles.center]}>
        <EmptyState
          icon="chart-box-outline"
          title="No insights yet"
          body="Save a few cars to your garage and we’ll break your collection down by line, year, and status."
        >
          <PrimaryButton label="Browse the catalog" onPress={() => router.navigate("/(tabs)")} />
        </EmptyState>
      </View>
    );
  }

  const maxLine = byLine[0]?.[1] ?? 0;
  const maxYear = byYear[0]?.count ?? 0;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={[styles.content, wideColumn]}
    >
      <StatRow>
        <StatTile label="Owned" value={byStatus.Owned} color={theme.officialText} />
        <StatTile label="Want" value={byStatus.Want} color={theme.rlcText} />
        <StatTile label="Dupes" value={byStatus.Duplicate} />
        <StatTile label="Hunts" value={hunts} color={theme.trackYellow} />
      </StatRow>

      <Card title="By line" style={styles.card}>
        {byLine.map(([line, count]) => (
          <BarRow key={line} label={LINE_LABEL[line]} value={count} max={maxLine} />
        ))}
      </Card>

      <Card title="Top years" style={styles.card}>
        {byYear.map(({ year, count }) => (
          <BarRow key={year} label={String(year)} value={count} max={maxYear} color={theme.trackOrange} />
        ))}
      </Card>

      <Text style={styles.sectionTitle}>Want list</Text>
      {wantList.length === 0 ? (
        <Text style={styles.mutedSmall}>
          Nothing on your want list. Mark a casting as Want to track it here.
        </Text>
      ) : (
        wantList.map((it, i) => (
          <CarRow
            key={it.id}
            index={i}
            title={it.car?.casting_name ?? "Car"}
            meta={it.car ? (it.car.series ? `${it.car.year} · ${it.car.series}` : String(it.car.year)) : ""}
            imageUri={it.car?.primary_image_url}
            line={it.car?.line_type}
            hunt={it.car?.treasure_hunt_type}
            onPress={() => router.push(`/car/${it.car_id}`)}
            accessibilityLabel={`${it.car?.casting_name ?? "Car"}. Open reference`}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  loading: { gap: theme.spaceLg },
  center: { justifyContent: "center" },
  card: { marginTop: theme.spaceLg },
  sectionTitle: {
    ...theme.typeSection,
    color: theme.text,
    marginTop: theme.spaceXl,
    marginBottom: theme.spaceMd,
  },
  mutedSmall: { color: theme.textMuted, fontSize: 14, lineHeight: 20, fontWeight: "500" },
});
