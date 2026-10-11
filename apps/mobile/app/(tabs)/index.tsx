import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { IconFilterSliders } from "../../components/icons/AppIcons";
import { huntFilterIconFor, lineFilterIconFor } from "../../components/icons/FilterPillIcons";
import type { CarListItemDto, LineType, TreasureHuntType, UserCarStatus } from "@hotwheels/shared";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CarRow } from "../../components/ui/CarRow";
import { ConfidencePill } from "../../components/ui/ConfidenceBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterChip } from "../../components/ui/FilterChip";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { SearchField } from "../../components/ui/SearchField";
import { CarListSkeleton } from "../../components/ui/Skeleton";
import { TextField } from "../../components/ui/TextField";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { fetchCars, fetchGarage } from "../../lib/api";
import { takePendingBarcode } from "../../lib/pendingScanStorage";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const PAGE_SIZE = 40;

type LineKey = LineType | "all";
type HuntKey = TreasureHuntType | "all";

const LINE_FILTERS: { key: LineKey; label: string }[] = [
  { key: "all", label: "All lines" },
  { key: "Mainline", label: "Mainline" },
  { key: "Premium", label: "Premium" },
  { key: "RLC", label: "RLC" },
  { key: "TeamTransport", label: "Team Transport" },
  { key: "Entertainment", label: "Entertainment" },
  { key: "Other", label: "Other" },
];

const HUNT_FILTERS: { key: HuntKey; label: string }[] = [
  { key: "all", label: "Any" },
  { key: "TH", label: "Treasure Hunt" },
  { key: "STH", label: "Super TH" },
  { key: "None", label: "Not a hunt" },
];

/** One-line explainer under each filter group — collectors new to the hobby need the vocabulary. */
const LINE_HELP: Record<LineKey, string> = {
  all: "Every line together — Mainline, Premium, RLC, Team Transport, Entertainment, and the rest.",
  Mainline: "Core retail assortments: the standard mix most pegs and dump bins are stocked from.",
  Premium: "Higher-detail segments like Car Culture — metal bases, Real Riders, premium card art.",
  RLC: "Red Line Club: Mattel’s membership line with heavier metal and serialized, limited drops.",
  TeamTransport: "A hauler or rig packaged with a matching vehicle, sold as one set.",
  Entertainment: "Licensed pop-culture releases: films, games, and media tie-ins.",
  Other: "Everything outside the main buckets — exclusives, multipacks, niche series.",
};

const HUNT_HELP: Record<HuntKey, string> = {
  all: "Standard cars, Treasure Hunts, and Super Treasure Hunts together.",
  TH: "Regular chase tier: special deco and a hidden flame logo on the car.",
  STH: "Top chase tier: Spectraflame-style paint, Real Riders, and a gold flame on the card.",
  None: "Hide chase variants so only standard releases appear.",
};

const THIS_YEAR = new Date().getFullYear();
const QUICK_YEARS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2, THIS_YEAR - 3].map(String);

const LIST_BELOW_TAB_EXTRA = 12;
const CHIP_ICON = 18;

const BLUE_TINT = { border: theme.accentSecondary, background: theme.accentSecondaryMuted };
const YELLOW_TINT = { border: theme.trackYellow, background: theme.accentYellowMuted };

function huntTint(key: HuntKey) {
  return key === "TH" || key === "STH" ? YELLOW_TINT : BLUE_TINT;
}

export default function SearchScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { isWide, contentMaxWidth } = useResponsiveLayout();

  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [line, setLine] = useState<LineKey>("all");
  const [hunt, setHunt] = useState<HuntKey>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const debouncedQ = useDebouncedValue(q, 280);
  // Half-typed years ("20") would match nothing — wait for all four digits.
  const yearValue = /^\d{4}$/.test(year.trim()) ? Number(year) : undefined;

  const queryBase = useMemo(() => {
    const trimmed = debouncedQ.trim();
    const looksSku = /^\d{8,14}$/.test(trimmed);
    return {
      q: looksSku ? undefined : trimmed || undefined,
      sku: looksSku ? trimmed : undefined,
      year: yearValue,
      line_type: line === "all" ? undefined : line,
      treasure_hunt_type: hunt === "all" ? undefined : hunt,
      limit: PAGE_SIZE,
    };
  }, [debouncedQ, yearValue, line, hunt]);

  const carsQuery = useInfiniteQuery({
    queryKey: ["cars", queryBase] as const,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchCars({
        ...queryBase,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    // Keep the last results on screen while the next search loads — no skeleton flash per keystroke.
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => carsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [carsQuery.data],
  );

  const garageQuery = useQuery({
    queryKey: ["garage"] as const,
    queryFn: fetchGarage,
    staleTime: 30_000,
  });

  const garageMap = useMemo(() => {
    const map = new Map<string, UserCarStatus>();
    for (const item of garageQuery.data?.items ?? []) {
      map.set(item.car_id, item.status);
    }
    return map;
  }, [garageQuery.data]);

  const totalCount = carsQuery.data?.pages[0]?.total ?? 0;
  const searching = carsQuery.isPlaceholderData || q.trim() !== debouncedQ.trim();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const code = await takePendingBarcode();
        if (code && active) setQ(code);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const activeFilterCount = (line !== "all" ? 1 : 0) + (hunt !== "all" ? 1 : 0) + (yearValue ? 1 : 0);
  const hasQuery = q.trim() !== "";

  const resetFilters = useCallback(() => {
    void Haptics.selectionAsync();
    setYear("");
    setLine("all");
    setHunt("all");
  }, []);

  const clearAll = useCallback(() => {
    resetFilters();
    setQ("");
  }, [resetFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void carsQuery.refetch().finally(() => setRefreshing(false));
  }, [carsQuery]);

  const onEndReached = useCallback(() => {
    if (carsQuery.isFetchingNextPage || !carsQuery.hasNextPage) return;
    void carsQuery.fetchNextPage();
  }, [carsQuery]);

  const renderItem = useCallback(
    ({ item, index }: { item: CarListItemDto; index: number }) => (
      <CarRow
        index={index}
        garageStatus={garageMap.get(item.id)}
        title={item.casting_name}
        meta={item.series ? `${item.year} · ${item.series}` : String(item.year)}
        imageUri={item.primary_image_url}
        line={item.line_type}
        hunt={item.treasure_hunt_type}
        badge={<ConfidencePill score={item.confidence_score} />}
        onPress={() => router.push(`/car/${item.id}`)}
        accessibilityLabel={`${item.casting_name}, ${item.year}${
          garageMap.has(item.id) ? `, in your garage as ${garageMap.get(item.id)}` : ""
        }. Open reference`}
      />
    ),
    [garageMap],
  );

  const wideStyle = useMemo((): ViewStyle | undefined => {
    if (!isWide) return undefined;
    return { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" };
  }, [isWide, contentMaxWidth]);

  const listHeader = useMemo(() => {
    if (carsQuery.isPending || carsQuery.isError || items.length === 0) return null;
    const noun = totalCount === 1 ? "casting" : "castings";
    return (
      <View style={styles.resultBar}>
        <Text style={styles.resultCount} accessibilityLiveRegion="polite">
          {totalCount.toLocaleString()} {noun}
        </Text>
        {searching ? <ActivityIndicator size="small" color={theme.textMuted} /> : null}
      </View>
    );
  }, [carsQuery.isPending, carsQuery.isError, items.length, totalCount, searching]);

  const listEmpty = useMemo(() => {
    if (carsQuery.isPending) return <CarListSkeleton />;
    if (carsQuery.isError) {
      return (
        <EmptyState
          icon="cloud-off-outline"
          tone="danger"
          title="Can’t reach the catalog"
          body={
            __DEV__
              ? "Check your connection. In development, make sure the API is running (npm run dev -w @hotwheels/api)."
              : "Check your connection and try again."
          }
        >
          <PrimaryButton label="Try again" onPress={() => void carsQuery.refetch()} />
        </EmptyState>
      );
    }
    return (
      <EmptyState
        icon="car-search-outline"
        title="No castings found"
        body={
          activeFilterCount > 0
            ? "Nothing matches this search with the current filters."
            : "Try a casting name, a series, or the numeric code from the card."
        }
      >
        {activeFilterCount > 0 ? (
          <PrimaryButton label="Clear filters" onPress={resetFilters} />
        ) : hasQuery ? (
          <PrimaryButton label="Clear search" variant="ghost" onPress={clearAll} />
        ) : null}
      </EmptyState>
    );
  }, [carsQuery, activeFilterCount, hasQuery, resetFilters, clearAll]);

  const listFooter = useMemo(() => {
    if (carsQuery.isFetchingNextPage) {
      return (
        <View style={styles.footer} accessibilityLabel="Loading more results">
          <ActivityIndicator color={theme.textMuted} />
        </View>
      );
    }
    if (items.length >= PAGE_SIZE && items.length === totalCount) {
      return <Text style={styles.footerMeta}>That’s all {totalCount.toLocaleString()}</Text>;
    }
    return null;
  }, [carsQuery.isFetchingNextPage, items.length, totalCount]);

  const resultsLabel = carsQuery.isError
    ? "Done"
    : searching || carsQuery.isPending
      ? "Searching…"
      : `Show ${totalCount.toLocaleString()} result${totalCount === 1 ? "" : "s"}`;

  return (
    <View style={styles.screen}>
      <View style={[styles.chrome, wideStyle]}>
        <View style={styles.searchRow}>
          <SearchField
            value={q}
            onChangeText={setQ}
            placeholder="Casting, series, or barcode"
            accessibilityLabel="Search the catalog by casting, series, or barcode number"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setFiltersOpen(true);
            }}
            style={({ pressed }) => [
              styles.filterBtn,
              activeFilterCount > 0 && styles.filterBtnActive,
              pressed && styles.filterBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"
            }
            accessibilityHint="Opens line, treasure hunt, and year filters"
          >
            <IconFilterSliders
              color={activeFilterCount > 0 ? theme.accentSecondary : theme.textSecondary}
              size={18}
            />
            <Text style={[styles.filterBtnTxt, activeFilterCount > 0 && styles.filterBtnTxtActive]}>
              Filters
            </Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Hunts first: the question collectors ask most in the aisle */}
          {(["TH", "STH"] as const).map((key) => {
            const selected = hunt === key;
            return (
              <FilterChip
                key={key}
                icon={huntFilterIconFor(key, selected ? theme.trackYellow : theme.textSecondary, CHIP_ICON)}
                label={key}
                selected={selected}
                onPress={() => setHunt(selected ? "all" : key)}
                a11yLabel={key === "TH" ? "Treasure Hunts only" : "Super Treasure Hunts only"}
                selectedTint={YELLOW_TINT}
              />
            );
          })}
          {LINE_FILTERS.filter((f) => f.key !== "all").map((f) => {
            const selected = line === f.key;
            return (
              <FilterChip
                key={f.key}
                icon={lineFilterIconFor(f.key, selected ? theme.accentSecondary : theme.textSecondary, CHIP_ICON)}
                label={f.label}
                selected={selected}
                onPress={() => setLine(selected ? "all" : f.key)}
                a11yLabel={`Line: ${f.label}`}
                selectedTint={BLUE_TINT}
              />
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        {...themedScrollIndicatorProps}
        style={[styles.listFlex, searching && items.length > 0 && styles.listStale]}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accentSecondary}
            colors={[theme.accentSecondary]}
            progressBackgroundColor={theme.bgElevated}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + LIST_BELOW_TAB_EXTRA },
          wideStyle,
        ]}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
      />

      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <View style={styles.sheetActions}>
            <View style={styles.sheetReset}>
              <PrimaryButton
                label="Reset"
                variant="ghost"
                onPress={resetFilters}
                disabled={activeFilterCount === 0 && year === ""}
              />
            </View>
            <View style={styles.sheetApply}>
              <PrimaryButton label={resultsLabel} onPress={() => setFiltersOpen(false)} />
            </View>
          </View>
        }
      >
        <Text style={styles.groupLabel}>Line</Text>
        <View style={styles.chipWrap}>
          {LINE_FILTERS.map((f) => {
            const selected = line === f.key;
            return (
              <FilterChip
                key={f.key}
                icon={lineFilterIconFor(f.key, selected ? theme.accentSecondary : theme.textSecondary, CHIP_ICON)}
                label={f.label}
                selected={selected}
                onPress={() => setLine(f.key)}
                a11yLabel={`Line: ${f.label}`}
                selectedTint={BLUE_TINT}
              />
            );
          })}
        </View>
        <Text style={styles.groupHelp}>{LINE_HELP[line]}</Text>

        <Text style={styles.groupLabel}>Treasure Hunt</Text>
        <View style={styles.chipWrap}>
          {HUNT_FILTERS.map((f) => {
            const selected = hunt === f.key;
            const tint = huntTint(f.key);
            return (
              <FilterChip
                key={f.key}
                icon={huntFilterIconFor(f.key, selected ? tint.border : theme.textSecondary, CHIP_ICON)}
                label={f.label}
                selected={selected}
                onPress={() => setHunt(f.key)}
                a11yLabel={`Treasure hunt: ${f.label}`}
                selectedTint={tint}
              />
            );
          })}
        </View>
        <Text style={styles.groupHelp}>{HUNT_HELP[hunt]}</Text>

        <Text style={styles.groupLabel}>Year</Text>
        <View style={styles.chipWrap}>
          {QUICK_YEARS.map((y) => {
            const selected = year === y;
            return (
              <FilterChip
                key={y}
                label={y}
                selected={selected}
                onPress={() => setYear(selected ? "" : y)}
                a11yLabel={`Year ${y}`}
                selectedTint={{ ...BLUE_TINT, text: theme.accentSecondary }}
              />
            );
          })}
        </View>
        <TextField
          label="Other year"
          value={year}
          onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))}
          placeholder="e.g. 1995"
          keyboardType="number-pad"
          maxLength={4}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  chrome: {
    paddingTop: theme.spaceSm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.bg,
  },
  searchRow: { paddingHorizontal: theme.spaceLg },
  quickRow: {
    paddingHorizontal: theme.spaceLg,
    paddingTop: theme.spaceMd,
    paddingBottom: theme.spaceXs,
    alignItems: "flex-start",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: theme.touchTargetMin,
    paddingHorizontal: 14,
    marginRight: theme.spaceSm,
    borderRadius: theme.radiusFull,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgElevated,
  },
  filterBtnActive: { borderColor: theme.accentSecondary, backgroundColor: theme.accentSecondaryMuted },
  filterBtnPressed: { opacity: 0.8 },
  filterBtnTxt: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },
  filterBtnTxtActive: { color: theme.accentSecondary },
  filterBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondary,
  },
  filterBadgeTxt: { fontSize: 12, fontWeight: "800", color: theme.bg },
  listFlex: { flex: 1, minHeight: 0 },
  listStale: { opacity: 0.55 },
  listContent: { flexGrow: 1, paddingHorizontal: theme.spaceLg, paddingTop: theme.spaceMd },
  resultBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 20,
    marginBottom: theme.spaceMd,
  },
  resultCount: { fontSize: 13, fontWeight: "700", color: theme.textMuted },
  footer: { paddingVertical: theme.spaceLg, alignItems: "center" },
  footerMeta: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 13,
    paddingVertical: theme.spaceLg,
    fontWeight: "500",
  },
  groupLabel: { ...theme.typeSection, fontSize: 15, color: theme.text, marginBottom: theme.spaceMd },
  groupHelp: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: theme.textMuted,
    marginBottom: theme.spaceXl,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  sheetActions: { flexDirection: "row", gap: theme.spaceSm },
  sheetReset: { flex: 1 },
  sheetApply: { flex: 2 },
});
