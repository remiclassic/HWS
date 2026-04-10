import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  IconCarSearchLarge,
  IconChevronDown,
  IconChevronUp,
  IconCloudOff,
  IconFilterSliders,
} from "../../components/icons/AppIcons";
import { huntFilterIconFor, lineFilterIconFor } from "../../components/icons/FilterPillIcons";
import type { CarListItemDto, LineType, TreasureHuntType } from "@hotwheels/shared";
import { FilterChip } from "../../components/ui/FilterChip";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { LineChip } from "../../components/ui/LineChip";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { fetchCars } from "../../lib/api";
import { takePendingBarcode } from "../../lib/pendingScanStorage";
import { motion } from "../../lib/motion";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const PAGE_SIZE = 40;

const LINE_FILTERS: { key: LineType | "all"; label: string }[] = [
  { key: "all", label: "All lines" },
  { key: "Mainline", label: "Mainline" },
  { key: "Premium", label: "Premium" },
  { key: "RLC", label: "RLC" },
  { key: "TeamTransport", label: "Team Transport" },
  { key: "Entertainment", label: "Entertainment" },
  { key: "Other", label: "Other" },
];

const HUNT_FILTERS: { key: TreasureHuntType | "all"; label: string }[] = [
  { key: "all", label: "Any hunt" },
  { key: "None", label: "Not TH" },
  { key: "TH", label: "TH" },
  { key: "STH", label: "STH" },
];

const LIST_BELOW_TAB_EXTRA = 12;

const CarRow = memo(function CarRow({ item, index }: { item: CarListItemDto; index: number }) {
  const onPress = useCallback(() => {
    router.push(`/car/${item.id}`);
  }, [item.id]);
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(true);

  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(19)
        .stiffness(280)
        .delay(Math.min(index * motion.staggerItemMs, 240))}
    >
      <ReanimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.rowCard, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Open reference: ${item.casting_name}`}
      >
        <View style={styles.rowTop}>
          {item.primary_image_url ? (
            <Image
              source={{ uri: item.primary_image_url }}
              style={styles.rowThumb}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.rowThumb, styles.rowThumbPlaceholder]} accessibilityElementsHidden />
          )}
          <View style={styles.rowTitleBlock}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {item.casting_name}
            </Text>
            <View style={styles.chipRow}>
              <LineChip line={item.line_type} />
              <HuntBadge type={item.treasure_hunt_type} />
            </View>
          </View>
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {item.year}
          {item.series ? ` · ${item.series}` : ""}
        </Text>
        <ConfidenceBar score={item.confidence_score} label="Reference confidence" />
      </ReanimatedPressable>
    </Animated.View>
  );
});

function ShimmerLine({ widthPct }: { widthPct: DimensionValue }) {
  const o = useSharedValue(0.36);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.68, { duration: 640 }),
        withTiming(0.36, { duration: 640 }),
      ),
      -1,
      false,
    );
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }), []);
  return <Animated.View style={[styles.skeletonLine, { width: widthPct }, anim]} />;
}

function ListLoadingSkeleton() {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading catalog">
      <ShimmerLine widthPct={"88%" as DimensionValue} />
      <ShimmerLine widthPct={"72%" as DimensionValue} />
      <ShimmerLine widthPct={"45%" as DimensionValue} />
    </View>
  );
}

const FILTER_LINE_HELP: Record<(typeof LINE_FILTERS)[number]["key"], { title: string; detail: string }> = {
  all: {
    title: "All lines",
    detail: "No line filter — show castings from Mainline, Premium, RLC, Team Transport, Entertainment, and other series together.",
  },
  Mainline: {
    title: "Mainline",
    detail: "Core retail assortments: the standard mix most pegs and dump bins are stocked from.",
  },
  Premium: {
    title: "Premium",
    detail: "Higher-detail segments like Car Culture — metal bases, Real Riders, and premium presentation vs basic mainline.",
  },
  RLC: {
    title: "Red Line Club (RLC)",
    detail:
      "Mattel’s membership-driven collector line: heavier metal, serialized drops, and packaging aimed at serious collectors.",
  },
  TeamTransport: {
    title: "Team Transport",
    detail: "Hauler or rig plus a matching vehicle in one set — ideal for display pairs.",
  },
  Entertainment: {
    title: "Entertainment",
    detail: "Licensed pop-culture releases: films, games, and media tie-ins beyond generic racing themes.",
  },
  Other: {
    title: "Other lines",
    detail: "Everything that isn’t in the main buckets — exclusives, multipacks, or niche series labels.",
  },
};

const FILTER_HUNT_HELP: Record<(typeof HUNT_FILTERS)[number]["key"], { title: string; detail: string }> = {
  all: {
    title: "Any hunt status",
    detail: "Include standard cars, Treasure Hunts, and Super Treasure Hunts — no hunt filter applied.",
  },
  None: {
    title: "Not a Treasure Hunt",
    detail: "Hide TH and STH chase variants so only non-chase listings appear.",
  },
  TH: {
    title: "Treasure Hunt (TH)",
    detail: "Regular chase tier: special deco and a hidden TH — not the Super variant.",
  },
  STH: {
    title: "Super Treasure Hunt (STH)",
    detail: "Top chase tier: premium finishes, Real Riders, and the gold circle-flame TH treatment.",
  },
};

const PILL_ICON_SIZE = 22;

const FilterSelectionHelp = memo(function FilterSelectionHelp({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <View
      style={styles.filterHelpBox}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${detail}`}
    >
      <Text style={styles.filterHelpTitle}>{title}</Text>
      <Text style={styles.filterHelpDetail}>{detail}</Text>
    </View>
  );
});

export default function SearchScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const listBottomPad = tabBarHeight + LIST_BELOW_TAB_EXTRA;

  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [line, setLine] = useState<(typeof LINE_FILTERS)[number]["key"]>("all");
  const [hunt, setHunt] = useState<(typeof HUNT_FILTERS)[number]["key"]>("all");

  const debouncedQ = useDebouncedValue(q, 280);

  const queryBase = useMemo(() => {
    const trimmed = debouncedQ.trim();
    const looksSku = /^\d{8,14}$/.test(trimmed);
    return {
      q: looksSku ? undefined : trimmed || undefined,
      sku: looksSku ? trimmed : undefined,
      year: year.trim() ? Number(year) : undefined,
      line_type: line === "all" ? undefined : line,
      treasure_hunt_type: hunt === "all" ? undefined : hunt,
      limit: PAGE_SIZE,
    };
  }, [debouncedQ, year, line, hunt]);

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
  });

  const items = useMemo(
    () => carsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [carsQuery.data],
  );

  const totalCount = carsQuery.data?.pages[0]?.total ?? 0;

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

  const renderItem = useCallback(
    ({ item, index }: { item: CarListItemDto; index: number }) => (
      <CarRow item={item} index={index} />
    ),
    [],
  );

  const listEmpty = useMemo(() => {
    if (carsQuery.isPending) {
      return <ListLoadingSkeleton />;
    }
    return (
      <View style={styles.emptyWrap}>
        <IconCarSearchLarge color={theme.textMuted} size={40} />
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.muted}>Try another query or clear filters.</Text>
      </View>
    );
  }, [carsQuery.isPending]);

  const listFooter = useMemo(() => {
    if (carsQuery.isFetchingNextPage) {
      return (
        <Text style={styles.footerLoading} accessibilityLabel="Loading more results">
          Loading more…
        </Text>
      );
    }
    if (items.length > 0 && totalCount > items.length) {
      return (
        <Text style={styles.footerMeta} accessibilityLabel={`Showing ${items.length} of ${totalCount}`}>
          Showing {items.length} of {totalCount} — scroll for more
        </Text>
      );
    }
    if (items.length > 0 && totalCount > 0 && items.length === totalCount) {
      return <Text style={styles.footerMeta}>End of results ({totalCount})</Text>;
    }
    return null;
  }, [carsQuery.isFetchingNextPage, items.length, totalCount]);

  const onEndReached = useCallback(() => {
    if (carsQuery.isFetchingNextPage || !carsQuery.hasNextPage) return;
    void carsQuery.fetchNextPage();
  }, [carsQuery]);

  const chromeWideStyle = useMemo((): ViewStyle | undefined => {
    if (!isWide) return undefined;
    return { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" };
  }, [isWide, contentMaxWidth]);

  const listWideStyle = useMemo((): ViewStyle | undefined => {
    if (!isWide || contentMaxWidth == null) return undefined;
    return { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" };
  }, [isWide, contentMaxWidth]);

  const showFilterScrollIndicator = Platform.OS === "android" || Platform.OS === "web";

  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const filterSummaryLine = useMemo(() => {
    const lineLabel =
      line === "all" ? "All lines" : (LINE_FILTERS.find((f) => f.key === line)?.label ?? String(line));
    const huntLabel =
      hunt === "all" ? "Any hunt" : (HUNT_FILTERS.find((f) => f.key === hunt)?.label ?? String(hunt));
    const y = year.trim();
    return y ? `${lineLabel} · ${huntLabel} · ${y}` : `${lineLabel} · ${huntLabel}`;
  }, [line, hunt, year]);

  const toggleFiltersExpanded = useCallback(() => {
    setFiltersExpanded((v) => !v);
  }, []);

  const filtersAreDirty = useMemo(
    () => year.trim() !== "" || line !== "all" || hunt !== "all",
    [year, line, hunt],
  );

  const resetFilters = useCallback(() => {
    void Haptics.selectionAsync();
    setYear("");
    setLine("all");
    setHunt("all");
  }, []);

  const filterTogglePress = usePressScale(true, motion.scalePressSubtle, motion.springChip);
  const resetFilterPress = usePressScale(true, motion.scalePressSubtle, motion.springChip);

  const listHeader = useMemo(
    () => (
      <View style={[styles.chrome, chromeWideStyle]}>
        <View style={[styles.heroShell, !filtersExpanded && styles.heroShellCompact]}>
          <LinearGradient
            colors={[...theme.heroWashGradientColors]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroWash}
            pointerEvents="none"
          />
          <Animated.View
            entering={FadeInDown.duration(420).delay(40)}
            style={[styles.heroBlock, !filtersExpanded && styles.heroBlockTight]}
          >
            <Text style={styles.heroKicker}>Identify in the aisle</Text>
            <Text style={styles.heroTitle}>Reference search</Text>
            <Text style={styles.heroSub} numberOfLines={filtersExpanded ? undefined : 2}>
              Official-first data with clear sources — built for collectors, not resale noise.
            </Text>
          </Animated.View>
        </View>

        <TextInput
          placeholder="Casting, series, or numeric SKU / UPC"
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor={theme.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <View style={[styles.filterPanel, filtersExpanded && styles.filterPanelOpen]}>
          <View style={[styles.filterPanelHeader, filtersExpanded && styles.filterPanelHeaderOpen]}>
            <ReanimatedPressable
              onPress={toggleFiltersExpanded}
              onPressIn={filterTogglePress.onPressIn}
              onPressOut={filterTogglePress.onPressOut}
              style={[styles.filterPanelHeaderMain, filterTogglePress.animatedStyle]}
              accessibilityRole="button"
              accessibilityLabel={filtersExpanded ? "Collapse filters" : "Expand filters"}
              accessibilityHint="Shows line, year, and treasure hunt options"
              accessibilityState={{ expanded: filtersExpanded }}
            >
              <IconFilterSliders color={theme.accentSecondary} size={22} />
              <View style={styles.filterSummaryTextBlock}>
                <Text style={styles.filterSummaryTitle}>Filters</Text>
                <Text style={styles.filterSummaryMeta} numberOfLines={1}>
                  {filterSummaryLine}
                </Text>
              </View>
            </ReanimatedPressable>
            {filtersExpanded ? (
              <>
                {filtersAreDirty ? (
                  <ReanimatedPressable
                    onPress={resetFilters}
                    onPressIn={resetFilterPress.onPressIn}
                    onPressOut={resetFilterPress.onPressOut}
                    style={[styles.filterResetBtn, resetFilterPress.animatedStyle]}
                    accessibilityRole="button"
                    accessibilityLabel="Reset filters"
                    accessibilityHint="Clears year, line, and treasure hunt filters"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.filterResetLabel}>Reset</Text>
                  </ReanimatedPressable>
                ) : (
                  <View
                    style={styles.filterResetBtn}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Text style={[styles.filterResetLabel, styles.filterResetLabelDisabled]}>Reset</Text>
                  </View>
                )}
                <ReanimatedPressable
                  onPress={toggleFiltersExpanded}
                  onPressIn={filterTogglePress.onPressIn}
                  onPressOut={filterTogglePress.onPressOut}
                  style={[styles.filterChevronBtn, filterTogglePress.animatedStyle]}
                  accessibilityRole="button"
                  accessibilityLabel={filtersExpanded ? "Collapse filters" : "Expand filters"}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconChevronUp color={theme.textSecondary} size={22} />
                </ReanimatedPressable>
              </>
            ) : (
              <ReanimatedPressable
                onPress={toggleFiltersExpanded}
                onPressIn={filterTogglePress.onPressIn}
                onPressOut={filterTogglePress.onPressOut}
                style={[styles.filterChevronBtn, filterTogglePress.animatedStyle]}
                accessibilityRole="button"
                accessibilityLabel={filtersExpanded ? "Collapse filters" : "Expand filters"}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconChevronDown color={theme.textSecondary} size={22} />
              </ReanimatedPressable>
            )}
          </View>

          {filtersExpanded ? (
            <View style={styles.filterPanelBody}>
              <Text style={styles.filterPanelHint}>
                Narrow the catalog by year, product line, and chase tier.
              </Text>
              <TextInput
                placeholder="Year (optional)"
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                style={styles.inputYear}
                placeholderTextColor={theme.textMuted}
              />

              <Text style={styles.filterLabel}>Line</Text>
              <Text style={styles.filterHint}>Swipe for more</Text>
              <ScrollView
                {...themedScrollIndicatorProps}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={showFilterScrollIndicator}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {LINE_FILTERS.map((f) => {
                  const selected = line === f.key;
                  const fg = selected ? theme.accentSecondary : theme.textSecondary;
                  return (
                    <FilterChip
                      key={f.key}
                      icon={lineFilterIconFor(f.key, fg, PILL_ICON_SIZE)}
                      selected={selected}
                      onPress={() => setLine(f.key)}
                      a11yLabel={`Line filter: ${f.label}`}
                      selectedTint={{
                        border: theme.accentSecondary,
                        background: theme.accentSecondaryMuted,
                      }}
                    />
                  );
                })}
              </ScrollView>
              <FilterSelectionHelp title={FILTER_LINE_HELP[line].title} detail={FILTER_LINE_HELP[line].detail} />

              <Text style={styles.filterLabel}>Treasure Hunt</Text>
              <Text style={styles.filterHint}>Swipe for more</Text>
              <ScrollView
                {...themedScrollIndicatorProps}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={showFilterScrollIndicator}
                style={styles.filterScrollLast}
                contentContainerStyle={styles.filterScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {HUNT_FILTERS.map((f) => {
                  const selected = hunt === f.key;
                  const isChase = f.key === "TH" || f.key === "STH";
                  const fg = selected
                    ? isChase
                      ? theme.trackYellow
                      : theme.accentSecondary
                    : theme.textSecondary;
                  const huntSelectedTint =
                    isChase
                      ? { border: theme.trackYellow, background: theme.accentYellowMuted }
                      : { border: theme.accentSecondary, background: theme.accentSecondaryMuted };
                  return (
                    <FilterChip
                      key={f.key}
                      icon={huntFilterIconFor(f.key, fg, PILL_ICON_SIZE)}
                      selected={selected}
                      onPress={() => setHunt(f.key)}
                      a11yLabel={`Treasure hunt filter: ${f.label}`}
                      selectedTint={huntSelectedTint}
                    />
                  );
                })}
              </ScrollView>
              <FilterSelectionHelp title={FILTER_HUNT_HELP[hunt].title} detail={FILTER_HUNT_HELP[hunt].detail} />
            </View>
          ) : null}
        </View>

        {carsQuery.isError ? (
          <View style={styles.bannerErr}>
            <IconCloudOff color={theme.danger} size={20} />
            <Text style={styles.bannerErrTxt}>
              Cannot reach API. Start the server (`npm run dev -w @hotwheels/api`) and check your network.
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [
      chromeWideStyle,
      filtersExpanded,
      q,
      year,
      line,
      hunt,
      filterSummaryLine,
      filtersAreDirty,
      toggleFiltersExpanded,
      resetFilters,
      filterTogglePress,
      resetFilterPress,
      showFilterScrollIndicator,
      carsQuery.isError,
    ],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        {...themedScrollIndicatorProps}
        style={styles.listFlex}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        nestedScrollEnabled
        refreshing={carsQuery.isFetching && !carsQuery.isFetchingNextPage}
        onRefresh={() => void carsQuery.refetch()}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            flexGrow: 1,
            paddingBottom: Math.max(theme.space3xl, listBottomPad),
          },
          listWideStyle,
        ]}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  chrome: {
    paddingBottom: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.bg,
  },
  listFlex: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: theme.spaceLg, paddingTop: theme.spaceMd },
  heroShell: {
    position: "relative",
    borderRadius: theme.radiusLg,
    overflow: "hidden",
    marginBottom: theme.spaceLg,
  },
  heroShellCompact: {
    marginBottom: theme.spaceSm,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radiusLg,
  },
  heroBlock: {
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceSm,
  },
  heroBlockTight: {
    paddingVertical: theme.spaceXs,
  },
  filterPanel: {
    marginBottom: theme.spaceSm,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    overflow: "hidden",
  },
  filterPanelOpen: {
    borderColor: theme.accentSecondary,
    borderWidth: 1,
    backgroundColor: theme.bgRaised,
  },
  filterPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    paddingVertical: 10,
    paddingHorizontal: theme.spaceMd,
  },
  filterPanelHeaderOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderSticker,
  },
  filterPanelHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minWidth: 0,
  },
  filterChevronBtn: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: theme.touchTargetMin,
    minHeight: theme.touchTargetMin,
    marginRight: -theme.spaceXs,
  },
  filterResetBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceSm,
    minHeight: theme.touchTargetMin,
  },
  filterResetLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.accentSecondary,
    letterSpacing: 0.2,
  },
  filterResetLabelDisabled: {
    color: theme.textMuted,
    fontWeight: "700",
  },
  filterPanelBody: {
    paddingTop: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    paddingBottom: theme.spaceMd,
  },
  filterPanelHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.textSecondary,
    marginBottom: theme.spaceMd,
  },
  filterSummaryTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  filterSummaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: theme.textMuted,
  },
  filterSummaryMeta: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  heroKicker: {
    ...theme.typeKicker,
    color: theme.trackYellow,
  },
  heroTitle: {
    ...theme.typeTitleLg,
    fontSize: 26,
    marginTop: 4,
    color: theme.text,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 12,
    marginBottom: theme.spaceSm,
    fontSize: 16,
    backgroundColor: theme.bgElevated,
    color: theme.text,
  },
  inputYear: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 11,
    marginBottom: theme.spaceSm,
    fontSize: 16,
    backgroundColor: theme.bgElevated,
    color: theme.text,
  },
  filterLabel: {
    ...theme.typeKicker,
    color: theme.textMuted,
    marginBottom: theme.spaceXs,
  },
  filterHint: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: theme.spaceXs,
    fontWeight: "500",
  },
  filterScroll: { marginBottom: theme.spaceXs, flexGrow: 0 },
  filterScrollLast: { marginBottom: theme.spaceXs, flexGrow: 0 },
  filterHelpBox: {
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
    marginBottom: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    ...theme.shadow.card,
  },
  filterHelpTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.text,
    letterSpacing: -0.2,
  },
  filterHelpDetail: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: theme.textSecondary,
  },
  filterScrollContent: {
    paddingRight: theme.spaceLg,
    paddingVertical: 2,
    alignItems: "center",
  },
  bannerErr: {
    flexDirection: "row",
    gap: theme.spaceSm,
    alignItems: "center",
    backgroundColor: theme.dangerSurface,
    borderRadius: theme.radiusMd,
    padding: theme.spaceMd,
    marginTop: theme.spaceSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.dangerBorder,
  },
  bannerErrTxt: { flex: 1, color: theme.danger, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  rowCard: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    padding: theme.spaceLg,
    marginBottom: theme.spaceMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    ...theme.shadow.card,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: theme.spaceMd },
  rowThumb: {
    width: 76,
    height: 52,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  rowThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitleBlock: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 18, fontWeight: "800", color: theme.text, letterSpacing: -0.2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginTop: theme.spaceSm },
  rowMeta: { marginTop: theme.spaceSm, color: theme.textSecondary, fontSize: 14, fontWeight: "500" },
  muted: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: theme.spaceSm,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyWrap: { alignItems: "center", marginTop: theme.space2xl, gap: theme.spaceSm },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.text },
  skeletonWrap: { marginTop: theme.spaceXl, gap: theme.spaceMd, paddingHorizontal: theme.spaceSm },
  skeletonLine: {
    height: 14,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.bgSubtle,
  },
  footerLoading: {
    textAlign: "center",
    color: theme.textMuted,
    paddingVertical: theme.spaceLg,
    fontWeight: "600",
  },
  footerMeta: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 13,
    paddingVertical: theme.spaceMd,
    fontWeight: "500",
  },
});
