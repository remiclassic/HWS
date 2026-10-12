import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  IconCarSearchLarge,
  IconCloudOff,
} from "../../components/icons/AppIcons";
import { huntFilterIconFor, lineFilterIconFor } from "../../components/icons/FilterPillIcons";
import type { CarListItemDto, LineType, TreasureHuntType, UserCarStatus } from "@hotwheels/shared";
import { CardSheen, useCardSheen, type CardSheenVariant } from "../../components/ui/CardSheen";
import { CarArt, hasCarArt } from "../../components/ui/CarArt";
import { FilterChip } from "../../components/ui/FilterChip";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { LineChip } from "../../components/ui/LineChip";
import { RemoteImage } from "../../components/ui/RemoteImage";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { fetchCars, fetchGarage } from "../../lib/api";
import { takePendingBarcode } from "../../lib/pendingScanStorage";
import { motion } from "../../lib/motion";
import {
  HEADER_SCENE_ASPECT,
  HEADER_SCENE_SETTINGS_HOTSPOT,
  spotterAssets,
} from "../../lib/spotterAssets";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const PAGE_SIZE = 40;

const GARAGE_BADGE_COLORS: Record<UserCarStatus, { text: string; bg: string; border: string }> = {
  Owned: { text: theme.ownedText, bg: theme.ownedBg, border: theme.ownedBorder },
  Want: { text: theme.accent, bg: theme.accentMuted, border: theme.accent + "55" },
  Duplicate: { text: theme.textSecondary, bg: theme.bgSubtle, border: theme.border },
};

const GarageStatusBadge = memo(function GarageStatusBadge({ status }: { status: UserCarStatus }) {
  const c = GARAGE_BADGE_COLORS[status];
  return (
    <View style={[styles.garageBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
      {status === "Owned" ? (
        <MaterialCommunityIcons name="check-circle" size={14} color={theme.ownedBorder} />
      ) : null}
      <Text style={[styles.garageBadgeTxt, { color: c.text }]}>{status}</Text>
    </View>
  );
});

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

/** Web: the input sits inside a bordered row, so drop the default focus ring. */
const webInputOutline = { outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle;

/** Tile outline + watermark follow the chase tier, like the card art on the pegs. */
const TILE_TIERS: Record<
  TreasureHuntType,
  { border: string; watermark: number; sheen: CardSheenVariant; crownBg?: string; crownFg?: string }
> = {
  None: { border: theme.tileBorder, watermark: spotterAssets.watermarkFlag, sheen: "foil" },
  TH: {
    sheen: "gold",
    border: theme.thBorder,
    watermark: spotterAssets.watermarkFlame,
    crownBg: theme.thBorder,
    crownFg: theme.textOnYellow,
  },
  STH: {
    sheen: "holo",
    border: theme.sthBorder,
    watermark: spotterAssets.watermarkEngine,
    crownBg: theme.sthBorder,
    crownFg: "#FFFFFF",
  },
};

const CarRow = memo(function CarRow({
  item,
  index,
  garageStatus,
}: {
  item: CarListItemDto;
  index: number;
  garageStatus?: UserCarStatus;
}) {
  const sheen = useCardSheen();
  const onPress = useCallback(() => {
    const open = () => router.push(`/car/${item.id}`);
    if (sheen.navDelayMs > 0) setTimeout(open, sheen.navDelayMs);
    else open();
  }, [item.id, sheen.navDelayMs]);
  const { animatedStyle, onPressIn: scaleIn, onPressOut } = usePressScale(true);
  const onPressIn = useCallback(() => {
    scaleIn();
    sheen.play();
  }, [scaleIn, sheen]);
  const tier = TILE_TIERS[item.treasure_hunt_type];

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
        style={[styles.rowCard, { borderColor: tier.border }, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Open reference: ${item.casting_name}`}
      >
        <LinearGradient
          colors={theme.tileGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={tier.watermark}
          style={styles.rowWatermark}
          contentFit="contain"
          tintColor={tier.border}
        />
        <View style={styles.rowImageWrap}>
          <RemoteImage
            uri={item.primary_image_url}
            style={styles.rowImage}
            accessibilityLabel={item.primary_image_url ? `${item.casting_name} thumbnail` : undefined}
          />
          {item.primary_image_url ? null : hasCarArt(item.casting_name) ? (
            <CarArt castingName={item.casting_name} />
          ) : (
            <View style={styles.rowImagePlaceholder}>
              <MaterialCommunityIcons name="car-side" size={34} color={theme.borderStrong} />
            </View>
          )}
          {tier.crownBg ? (
            <View style={[styles.rowCrown, { backgroundColor: tier.crownBg }]}>
              <MaterialCommunityIcons name="crown" size={14} color={tier.crownFg} />
            </View>
          ) : null}
        </View>
        <View style={styles.rowTitleBlock}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.casting_name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.year}
            {item.series ? ` · ${item.series}` : ""}
          </Text>
          <View style={styles.chipRow}>
            <LineChip line={item.line_type} />
            <HuntBadge type={item.treasure_hunt_type} />
            {garageStatus != null && <GarageStatusBadge status={garageStatus} />}
          </View>
        </View>
        <View style={styles.rowChevron}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.text} />
        </View>
        <CardSheen progress={sheen.progress} variant={tier.sheen} />
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
      <ShimmerLine widthPct={"88%" as DimensionValue} />
      <ShimmerLine widthPct={"68%" as DimensionValue} />
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
  const insets = useSafeAreaInsets();
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
      <CarRow item={item} index={index} garageStatus={garageMap.get(item.id)} />
    ),
    [garageMap],
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

  const linePillLabel = useMemo(() => {
    const lineLabel =
      line === "all" ? "All lines" : (LINE_FILTERS.find((f) => f.key === line)?.label ?? String(line));
    const y = year.trim();
    return y ? `${lineLabel} · ${y}` : lineLabel;
  }, [line, year]);

  const huntPillLabel = useMemo(
    () => (hunt === "all" ? "Any hunt" : (HUNT_FILTERS.find((f) => f.key === hunt)?.label ?? String(hunt))),
    [hunt],
  );

  const openScan = useCallback(() => {
    router.push("/scan");
  }, []);

  const openSettings = useCallback(() => {
    router.push("/settings");
  }, []);

  const toggleFiltersExpanded = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <View style={styles.hero}>
          <Image
            source={spotterAssets.headerScene}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel="Spotter — find, collect, track"
          />
          <Pressable
            onPress={openSettings}
            style={[styles.heroSettings, HEADER_SCENE_SETTINGS_HOTSPOT]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          />
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={24} color={theme.text} />
          <TextInput
            placeholder="Casting, series, or SKU / UPC"
            value={q}
            onChangeText={setQ}
            style={[styles.searchInput, Platform.OS === "web" && webInputOutline]}
            placeholderTextColor={theme.inputPlaceholder}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search the catalog"
          />
          {q ? (
            <Pressable
              onPress={() => setQ("")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={openScan}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Scan barcode"
          >
            <MaterialCommunityIcons name="barcode-scan" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.filterBar}>
          <ReanimatedPressable
            onPress={toggleFiltersExpanded}
            onPressIn={filterTogglePress.onPressIn}
            onPressOut={filterTogglePress.onPressOut}
            style={[
              styles.filterPill,
              (filtersExpanded || line !== "all" || year.trim() !== "") && styles.filterPillActive,
              filterTogglePress.animatedStyle,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Line filter: ${linePillLabel}`}
            accessibilityHint="Shows line, year, and treasure hunt options"
            accessibilityState={{ expanded: filtersExpanded }}
          >
            <MaterialCommunityIcons name="filter-outline" size={16} color={theme.accentSecondary} />
            <Text style={styles.filterPillLabel} numberOfLines={1}>
              {linePillLabel}
            </Text>
            <MaterialCommunityIcons
              name={filtersExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.text}
            />
          </ReanimatedPressable>
          <ReanimatedPressable
            onPress={toggleFiltersExpanded}
            onPressIn={filterTogglePress.onPressIn}
            onPressOut={filterTogglePress.onPressOut}
            style={[
              styles.filterPill,
              (filtersExpanded || hunt !== "all") && styles.filterPillActive,
              filterTogglePress.animatedStyle,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Treasure hunt filter: ${huntPillLabel}`}
            accessibilityHint="Shows line, year, and treasure hunt options"
            accessibilityState={{ expanded: filtersExpanded }}
          >
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.text} />
            <Text style={styles.filterPillLabel} numberOfLines={1}>
              {huntPillLabel}
            </Text>
            <MaterialCommunityIcons
              name={filtersExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.text}
            />
          </ReanimatedPressable>
          {!carsQuery.isError && totalCount > 0 ? (
            <View style={styles.countPill} accessibilityLiveRegion="polite">
              <Text style={styles.countPillLabel} numberOfLines={1}>
                {totalCount.toLocaleString()} {totalCount === 1 ? "car" : "cars"}
              </Text>
            </View>
          ) : null}
        </View>

        {filtersExpanded ? (
          <Animated.View
            layout={LinearTransition.duration(240).easing(Easing.out(Easing.cubic))}
            style={[styles.filterPanel, styles.filterPanelOpen]}
          >
            <View style={[styles.filterPanelHeader, styles.filterPanelHeaderOpen]}>
              <Text style={styles.filterSummaryTitle}>Filters</Text>
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
            </View>

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
                placeholderTextColor={theme.inputPlaceholder}
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
          </Animated.View>
        ) : null}

        {carsQuery.isError ? (
          <View style={styles.bannerErr}>
            <IconCloudOff color={theme.danger} size={20} />
            <Text style={styles.bannerErrTxt}>Could not load the catalog. Check your connection.</Text>
            <Pressable
              onPress={() => void carsQuery.refetch()}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry loading catalog"
            >
              <Text style={styles.retryBtnTxt}>Retry</Text>
            </Pressable>
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
      linePillLabel,
      huntPillLabel,
      openScan,
      openSettings,
      filtersAreDirty,
      toggleFiltersExpanded,
      resetFilters,
      filterTogglePress,
      resetFilterPress,
      showFilterScrollIndicator,
      carsQuery,
      totalCount,
    ],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
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
  },
  hero: {
    marginHorizontal: -theme.spaceLg,
    aspectRatio: HEADER_SCENE_ASPECT,
    marginBottom: theme.spaceSm,
    backgroundColor: theme.bgSubtle,
    overflow: "hidden",
  },
  heroSettings: {
    position: "absolute",
    aspectRatio: 1,
    borderRadius: theme.radiusSm,
  },
  listFlex: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: theme.spaceLg },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    marginBottom: theme.spaceSm,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceXs,
    flexShrink: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: theme.radiusMd,
    borderWidth: 1.5,
    borderColor: theme.tileBorder,
    backgroundColor: theme.bgSubtle,
  },
  filterPillActive: {
    borderColor: theme.accentSecondary,
    backgroundColor: theme.bgRaised,
  },
  filterPillLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
  },
  countPill: {
    flexShrink: 0,
    marginLeft: "auto",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgSubtle,
  },
  countPillLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
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
    backgroundColor: theme.bgRaised,
    ...Platform.select({
      web: { boxShadow: "0px 2px 12px rgba(59, 155, 255, 0.12)" },
      default: {
        shadowColor: theme.accentSecondary,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  filterPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spaceSm,
    paddingLeft: theme.spaceMd,
    paddingRight: theme.spaceXs,
  },
  filterPanelHeaderOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderSticker,
  },
  filterResetBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceSm,
    minWidth: 68,
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
  filterSummaryTitle: {
    ...theme.typeKicker,
    color: theme.textSecondary,
  },
  inputYear: {
    borderWidth: 1,
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    minHeight: 50,
    paddingHorizontal: theme.spaceLg,
    marginBottom: theme.spaceMd,
    borderRadius: theme.radiusMd,
    borderWidth: 1.5,
    borderColor: theme.tileBorder,
    backgroundColor: theme.bgSubtle,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, color: theme.text, paddingVertical: 10 },
  retryBtn: {
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 6,
    borderRadius: theme.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.danger,
  },
  retryBtnTxt: { color: theme.danger, fontWeight: "800", fontSize: 13 },
  rowCard: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 96,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    marginBottom: theme.spaceMd,
    borderWidth: 1.5,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  rowWatermark: {
    position: "absolute",
    right: 30,
    bottom: -6,
    width: 120,
    height: 78,
    opacity: 0.28,
  },
  rowImageWrap: {
    width: "38%",
    maxWidth: 168,
    backgroundColor: theme.bgSubtle,
  },
  rowImage: { ...StyleSheet.absoluteFillObject },
  rowImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCrown: {
    position: "absolute",
    top: 0,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomRightRadius: theme.radiusSm,
  },
  rowChevron: {
    justifyContent: "center",
    paddingRight: theme.spaceSm,
  },
  rowTitleBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingVertical: theme.spaceMd,
    paddingLeft: theme.spaceMd,
    paddingRight: theme.spaceXs,
  },
  rowTitle: { fontSize: 17, fontWeight: "800", color: theme.text, letterSpacing: -0.2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginTop: theme.spaceSm },
  rowMeta: { marginTop: 2, color: theme.textSecondary, fontSize: 13, fontWeight: "600" },
  muted: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: theme.spaceSm,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyWrap: { alignItems: "center", marginTop: theme.space2xl, gap: theme.spaceSm },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.text },
  skeletonWrap: {
    marginTop: theme.spaceXl,
    gap: theme.spaceMd,
    paddingHorizontal: theme.spaceSm,
    minHeight: 280,
  },
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
  garageBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radiusFull,
    borderWidth: 1.5,
  },
  garageBadgeTxt: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
