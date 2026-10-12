import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { UserCarDto } from "@hotwheels/shared";
import { IconGarageTab } from "../components/icons/AppIcons";
import { RaceGame } from "../components/race/RaceGame";
import { TopDownCar } from "../components/race/TopDownCar";
import { CarArt, hasCarArt } from "../components/ui/CarArt";
import { HuntBadge } from "../components/ui/HuntBadge";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { RemoteImage } from "../components/ui/RemoteImage";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { fetchGarage } from "../lib/api";
import { formatRaceTime, houseRival, racerFromCar, statBars, type Racer } from "../lib/race/carStats";
import { loadTrackRecord, type TrackRecord } from "../lib/race/records";
import { TRACK } from "../lib/race/track";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

const LAPS = 3;
const RIVALS = 3;
const GRID_GAP = theme.spaceMd;

type OwnedCar = { item: UserCarDto; racer: Racer };

type RaceSetup = { racers: Racer[]; run: number };

function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const StatBar = memo(function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow} accessibilityLabel={`${label} ${Math.round(value * 100)} percent`}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${Math.round(value * 100)}%` }]} />
      </View>
    </View>
  );
});

const CarCard = memo(function CarCard({
  owned,
  selected,
  width,
  onSelect,
}: {
  owned: OwnedCar;
  selected: boolean;
  width: number;
  onSelect: (key: string) => void;
}) {
  const { item, racer } = owned;
  const car = item.car;
  const thumbUri = item.photos?.[0]?.url ?? car?.primary_image_url ?? null;
  const bars = statBars(racer.spec);
  return (
    <Pressable
      onPress={() => onSelect(racer.key)}
      style={({ pressed }) => [styles.card, { width }, selected && styles.cardSelected, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Race ${racer.name}`}
    >
      <View style={styles.cardImageWrap}>
        <RemoteImage uri={thumbUri} style={styles.cardImage} />
        {thumbUri ? null : hasCarArt(car?.casting_name) ? (
          <CarArt castingName={car?.casting_name} />
        ) : (
          <View style={styles.cardImageIcon}>
            <IconGarageTab color={theme.borderStrong} size={36} />
          </View>
        )}
        {car && car.treasure_hunt_type !== "None" ? (
          <View style={styles.cardBadge}>
            <HuntBadge type={car.treasure_hunt_type} />
          </View>
        ) : null}
        <View style={styles.cardSprite}>
          <TopDownCar paint={racer.paint} length={36} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {racer.name}
        </Text>
        <StatBar label="Speed" value={bars.speed} />
        <StatBar label="Accel" value={bars.accel} />
        <StatBar label="Grip" value={bars.handling} />
      </View>
    </Pressable>
  );
});

export default function RaceScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const garageQuery = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });

  const [carKey, setCarKey] = useState<string | null>(null);
  const [setup, setSetup] = useState<RaceSetup | null>(null);
  const [record, setRecord] = useState<TrackRecord | null>(null);

  // One racer per casting the user actually has (wanted cars are not raceable).
  const ownedCars = useMemo(() => {
    const seen = new Set<string>();
    const out: OwnedCar[] = [];
    for (const item of garageQuery.data?.items ?? []) {
      if (item.status === "Want" || !item.car || seen.has(item.car_id)) continue;
      seen.add(item.car_id);
      out.push({ item, racer: racerFromCar(item.car) });
    }
    return out;
  }, [garageQuery.data?.items]);

  const selected = ownedCars.find((o) => o.racer.key === carKey) ?? ownedCars[0] ?? null;

  // Refresh personal bests whenever the picker is showing (i.e. also after a race).
  const picking = setup == null;
  useEffect(() => {
    if (!picking) return;
    let cancelled = false;
    void loadTrackRecord(TRACK.id).then((r) => {
      if (!cancelled) setRecord(r);
    });
    return () => {
      cancelled = true;
    };
  }, [picking]);

  const startRace = useCallback(() => {
    if (!selected) return;
    const rivals = shuffled(ownedCars.filter((o) => o !== selected))
      .slice(0, RIVALS)
      .map((o) => o.racer);
    while (rivals.length < RIVALS) rivals.push(houseRival(rivals.length));
    setSetup({ racers: [selected.racer, ...rivals], run: 0 });
  }, [selected, ownedCars]);

  const restart = useCallback(() => setSetup((s) => (s ? { ...s, run: s.run + 1 } : s)), []);
  const exitRace = useCallback(() => setSetup(null), []);

  const containerWidth = (isWide ? Math.min(windowWidth, contentMaxWidth) : windowWidth) - theme.spaceLg * 2;
  const cardWidth = Math.floor((containerWidth - GRID_GAP) / 2);
  const wideColumn = isWide
    ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
    : undefined;

  const renderCar = useCallback(
    ({ item }: { item: OwnedCar }) => (
      <CarCard owned={item} selected={item === selected} width={cardWidth} onSelect={setCarKey} />
    ),
    [selected, cardWidth],
  );

  if (setup) {
    return (
      <>
        {/* Thumbs rest on the screen edge, so the iOS back-swipe is off mid-race. */}
        <Stack.Screen options={{ title: TRACK.name, gestureEnabled: false }} />
        <RaceGame
          key={setup.run}
          racers={setup.racers}
          laps={LAPS}
          onRestart={restart}
          onExit={exitRace}
        />
      </>
    );
  }

  if (garageQuery.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading garage…</Text>
      </View>
    );
  }

  if (!selected) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyArt}>
          <MaterialCommunityIcons name="flag-checkered" size={44} color={theme.accentSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No cars to race yet</Text>
        <Text style={styles.emptyBody}>
          {garageQuery.isError
            ? "Could not load your garage. Check your connection and try again."
            : "Add a car you own to your garage and it shows up on the starting grid."}
        </Text>
        <View style={styles.centerAction}>
          {garageQuery.isError ? (
            <PrimaryButton label="Retry" onPress={() => void garageQuery.refetch()} />
          ) : (
            <PrimaryButton label="Browse catalog" onPress={() => router.push("/")} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: "Race", gestureEnabled: true }} />
      <FlatList
        {...themedScrollIndicatorProps}
        data={ownedCars}
        keyExtractor={(o) => o.racer.key}
        renderItem={renderCar}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.list, wideColumn]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.trackCard} accessibilityLabel={`Track: ${TRACK.name}`}>
              <MaterialCommunityIcons name="road-variant" size={28} color={theme.trackOrange} />
              <View style={styles.trackText}>
                <Text style={styles.trackName}>{TRACK.name}</Text>
                <Text style={styles.trackBlurb}>{TRACK.blurb}</Text>
              </View>
              <View style={styles.trackBestBox}>
                <Text style={styles.trackBestLabel}>Best</Text>
                <Text style={styles.trackBest}>
                  {record && record.bestRace > 0 ? formatRaceTime(record.bestRace) : "—"}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Your car</Text>
            <Text style={styles.sectionHint}>
              {LAPS} laps against {RIVALS} rivals{ownedCars.length > 1 ? " from your garage" : ""}.
            </Text>
          </View>
        }
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spaceMd) }]}>
        <View style={wideColumn}>
          <PrimaryButton
            label={`Race ${selected.racer.name}`}
            icon={<MaterialCommunityIcons name="flag-checkered" size={22} color="#fff" />}
            onPress={startRace}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { padding: theme.spaceLg, paddingBottom: theme.spaceXl },
  pressed: { opacity: 0.8 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
    padding: theme.spaceXl,
    gap: theme.spaceSm,
  },
  centerAction: { alignSelf: "stretch", maxWidth: 320, width: "100%", marginTop: theme.spaceMd },
  muted: { color: theme.textMuted, fontWeight: "600" },
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

  header: { marginBottom: theme.spaceMd },
  sectionTitle: { ...theme.typeTitleMd, fontSize: 20, color: theme.text, marginBottom: theme.spaceSm },
  sectionHint: { fontSize: 14, fontWeight: "500", color: theme.textMuted, marginTop: -4 },
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
    marginBottom: theme.spaceXl,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.border,
  },
  trackText: { flex: 1, minWidth: 0, gap: 2 },
  trackName: { fontSize: 16, fontWeight: "800", color: theme.text },
  trackBlurb: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: theme.textSecondary },
  trackBestBox: { alignItems: "flex-end" },
  trackBestLabel: { ...theme.typeKicker, fontSize: 10, color: theme.textMuted },
  trackBest: { fontSize: 16, fontWeight: "900", color: theme.text, fontVariant: ["tabular-nums"] },

  gridRow: { gap: GRID_GAP },
  card: {
    marginBottom: GRID_GAP,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: 2,
    borderColor: theme.border,
    overflow: "hidden",
  },
  cardSelected: { borderColor: theme.trackYellow },
  cardImageWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: theme.bgSubtle },
  cardImage: { width: "100%", height: "100%" },
  cardImageIcon: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  cardBadge: { position: "absolute", top: theme.spaceSm, left: theme.spaceSm },
  cardSprite: {
    position: "absolute",
    right: theme.spaceSm,
    bottom: theme.spaceSm,
    padding: 5,
    borderRadius: theme.radiusSm,
    backgroundColor: "rgba(7, 20, 34, 0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderSticker,
  },
  cardBody: { padding: theme.spaceMd, gap: 6 },
  // Two lines reserved so cards in a row stay the same height
  cardTitle: { fontSize: 15, lineHeight: 20, minHeight: 40, fontWeight: "800", color: theme.text },
  statRow: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm },
  statLabel: { width: 42, fontSize: 11, fontWeight: "700", color: theme.textSecondary },
  statTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgSubtle, overflow: "hidden" },
  statFill: { height: "100%", borderRadius: 3, backgroundColor: theme.trackOrange },

  footer: {
    paddingHorizontal: theme.spaceLg,
    paddingTop: theme.spaceMd,
    backgroundColor: theme.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
});
