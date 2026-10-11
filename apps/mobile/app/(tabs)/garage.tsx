import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  IconBarcodeScan,
  IconCarSearchLarge,
  IconCloudOff,
  IconGarageTab,
  IconPackage,
  IconPencil,
  IconTrash,
} from "../../components/icons/AppIcons";
import type { LineType, UserCarDto } from "@hotwheels/shared";
import { ActionSheet, type ActionSheetOption } from "../../components/ui/ActionSheet";
import { FilterChip } from "../../components/ui/FilterChip";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { RemoteImage } from "../../components/ui/RemoteImage";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { useToast } from "../../contexts/ToastContext";
import { useGarageQueueDepth } from "../../hooks/useGarageQueueDepth";
import { deleteGarageItem, fetchGarage } from "../../lib/api";
import { garageStatusChipTint } from "../../lib/garageFormChips";
import { enqueueGarageOp, isTransientNetworkError } from "../../lib/garageMutationQueue";
import {
  DEFAULT_GARAGE_FILTERS,
  GARAGE_SORT_LABELS,
  filterGarage,
  garageFiltersAreActive,
  garageStats,
  sortGarage,
  type GarageFilters,
  type GarageSort,
  type GarageStatusFilter,
  type GarageViewMode,
} from "../../lib/garageView";
import { getIsOnline, useOnline } from "../../lib/network";
import { motion } from "../../lib/motion";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const LIST_BELOW_TAB_EXTRA = 12;
const GRID_GAP = theme.spaceMd;
const UNDO_WINDOW_MS = 5000;
const VIEW_MODE_STORAGE_KEY = "garage.viewMode";

const STATUS_FILTERS: { key: GarageStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Owned", label: "Owned" },
  { key: "Want", label: "Want" },
  { key: "Duplicate", label: "Duplicate" },
];

const LINE_LABELS: Record<LineType, string> = {
  Mainline: "Mainline",
  Premium: "Premium",
  RLC: "RLC",
  TeamTransport: "Team Transport",
  Entertainment: "Entertainment",
  Other: "Other",
};

const SORTS: GarageSort[] = ["recent", "name", "year"];

const NEUTRAL_CHIP_TINT = {
  border: theme.accentSecondary,
  background: theme.accentSecondaryMuted,
  text: theme.accentSecondary,
};
const HUNT_CHIP_TINT = {
  border: theme.trackYellow,
  background: theme.accentYellowMuted,
  text: theme.trackYellow,
};

/** Web: the input sits inside a bordered row, so drop the default focus ring. */
const webInputOutline = { outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle;

function itemMeta(item: UserCarDto): string {
  const parts: string[] = [item.condition];
  if (item.car?.year) parts.push(String(item.car.year));
  if (item.car?.series) parts.push(item.car.series);
  return parts.join(" · ");
}

const StatusPill = memo(function StatusPill({ status }: { status: UserCarDto["status"] }) {
  const tint = garageStatusChipTint[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: tint.background }]}>
      <Text style={[styles.statusTxt, { color: tint.text }]}>{status}</Text>
    </View>
  );
});

type CardProps = {
  item: UserCarDto;
  index: number;
  mode: GarageViewMode;
  /** Grid only — fixed so an odd last card does not stretch across the row. */
  width?: number;
  onOpenMenu: (row: UserCarDto) => void;
};

const GarageCard = memo(function GarageCard({ item, index, mode, width, onOpenMenu }: CardProps) {
  const car = item.car;
  const name = car?.casting_name ?? "Car";
  const thumbUri = item.photos?.[0]?.url ?? car?.primary_image_url ?? null;
  const mainPress = usePressScale(true);
  const isGrid = mode === "grid";

  const image = (
    <View style={isGrid ? styles.gridImageWrap : styles.listImageWrap}>
      <RemoteImage
        uri={thumbUri}
        style={styles.image}
        accessibilityLabel={thumbUri ? `${name} photo` : undefined}
      />
      {!thumbUri ? (
        <View style={styles.imagePlaceholderIcon}>
          <IconGarageTab color={theme.borderStrong} size={isGrid ? 40 : 28} />
        </View>
      ) : null}
      {isGrid && car && car.treasure_hunt_type !== "None" ? (
        <View style={styles.imageBadgeTopLeft}>
          <HuntBadge type={car.treasure_hunt_type} />
        </View>
      ) : null}
      {item.quantity > 1 ? (
        <View style={styles.qtyBadge} accessibilityLabel={`Quantity ${item.quantity}`}>
          <Text style={styles.qtyTxt}>×{item.quantity}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(19)
        .stiffness(280)
        .delay(Math.min(index * motion.staggerItemMs, 220))}
      style={[styles.card, isGrid ? { width } : styles.cardList]}
    >
      <ReanimatedPressable
        onPress={() => router.push(`/car/${item.car_id}`)}
        onLongPress={() => onOpenMenu(item)}
        onPressIn={mainPress.onPressIn}
        onPressOut={mainPress.onPressOut}
        style={[isGrid ? styles.gridMain : styles.listMain, mainPress.animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Open reference: ${name}`}
        accessibilityHint="Long-press for edit and remove"
      >
        {image}
        <View style={isGrid ? styles.gridBody : styles.listBody}>
          <Text style={[styles.cardTitle, isGrid && styles.cardTitleGrid]} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {itemMeta(item)}
          </Text>
          <View style={styles.cardPills}>
            <StatusPill status={item.status} />
            {!isGrid && car ? <HuntBadge type={car.treasure_hunt_type} /> : null}
          </View>
        </View>
      </ReanimatedPressable>
      <Pressable
        onPress={() => onOpenMenu(item)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.menuBtn,
          isGrid ? styles.menuBtnGrid : styles.menuBtnList,
          pressed && styles.menuBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${name}`}
      >
        <MaterialCommunityIcons name="dots-horizontal" size={22} color={theme.text} />
      </Pressable>
    </Animated.View>
  );
});

const StatTile = memo(function StatTile({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statTile} accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

function LoadingSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={styles.skeletonGrid} accessibilityLabel="Loading garage">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.card, styles.skeletonCard, { width: cardWidth }]}>
          <View style={styles.gridImageWrap} />
          <View style={styles.gridBody}>
            <View style={[styles.skeletonLine, { width: "80%" }]} />
            <View style={[styles.skeletonLine, { width: "50%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GarageScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const listBottomPad = tabBarHeight + LIST_BELOW_TAB_EXTRA;
  const online = useOnline();
  const pendingGarage = useGarageQueueDepth();

  const [filters, setFilters] = useState<GarageFilters>(DEFAULT_GARAGE_FILTERS);
  const [sort, setSort] = useState<GarageSort>("recent");
  const [viewMode, setViewMode] = useState<GarageViewMode>("grid");
  const [menuRow, setMenuRow] = useState<UserCarDto | null>(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  /** Rows hidden while their delete waits out the undo window or is in flight. */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());

  const { show: showToast, showError, dismiss: dismissToast } = useToast();

  useEffect(() => {
    void AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY)
      .then((v) => {
        if (v === "grid" || v === "list") setViewMode(v);
      })
      .catch(() => {});
  }, []);

  const toggleViewMode = useCallback(() => {
    void Haptics.selectionAsync();
    setViewMode((prev) => {
      const next = prev === "grid" ? "list" : "grid";
      void AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const qc = useQueryClient();
  const garageQuery = useQuery({
    queryKey: ["garage"] as const,
    queryFn: fetchGarage,
  });

  const unhide = useCallback((id: string) => {
    setHiddenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const del = useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteGarageItem(id);
        return { queued: false as const };
      } catch (e) {
        const likelyOffline = !(await getIsOnline());
        if (likelyOffline || isTransientNetworkError(e)) {
          await enqueueGarageOp({ v: 1, kind: "delete", id });
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: async (res, id) => {
      if (res.queued) {
        // The row is still on the server until the queue drains; keep it hidden meanwhile.
        showToast({ message: "Offline — removal queued. It will apply when you’re back online." });
        return;
      }
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      unhide(id);
    },
    onError: (e, id) => {
      unhide(id);
      showError("Could not remove", e);
    },
  });
  const deleteNow = del.mutate;

  const pendingRemoval = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const commitPendingRemoval = useCallback(() => {
    const pending = pendingRemoval.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRemoval.current = null;
    deleteNow(pending.id);
  }, [deleteNow]);

  // Leaving the screen must not drop a removal that is still inside its undo window.
  const commitOnUnmount = useRef(commitPendingRemoval);
  useEffect(() => {
    commitOnUnmount.current = commitPendingRemoval;
  }, [commitPendingRemoval]);
  useEffect(() => () => commitOnUnmount.current(), []);

  const requestRemove = useCallback(
    (row: UserCarDto) => {
      commitPendingRemoval();
      const id = row.id;
      setHiddenIds((prev) => new Set(prev).add(id));
      pendingRemoval.current = { id, timer: setTimeout(commitPendingRemoval, UNDO_WINDOW_MS) };
      showToast({
        message: `Removed “${row.car?.casting_name ?? "car"}”`,
        actionLabel: "Undo",
        durationMs: UNDO_WINDOW_MS,
        onAction: () => {
          if (pendingRemoval.current?.id !== id) return;
          clearTimeout(pendingRemoval.current.timer);
          pendingRemoval.current = null;
          unhide(id);
          dismissToast();
        },
      });
    },
    [commitPendingRemoval, showToast, dismissToast, unhide],
  );

  const allItems = useMemo(
    () => (garageQuery.data?.items ?? []).filter((i) => !hiddenIds.has(i.id)),
    [garageQuery.data?.items, hiddenIds],
  );
  const stats = useMemo(() => garageStats(allItems), [allItems]);
  const visibleItems = useMemo(
    () => sortGarage(filterGarage(allItems, filters), sort),
    [allItems, filters, sort],
  );
  const filtersActive = garageFiltersAreActive(filters);
  const hasItems = stats.total > 0;

  // A line chip can disappear when the last car of that line is removed.
  useEffect(() => {
    if (filters.line !== "all" && !stats.lines.includes(filters.line)) {
      setFilters((f) => ({ ...f, line: "all" }));
    }
  }, [filters.line, stats.lines]);

  const clearFilters = useCallback(() => setFilters(DEFAULT_GARAGE_FILTERS), []);

  const containerWidth =
    (isWide ? Math.min(windowWidth, contentMaxWidth) : windowWidth) - theme.spaceLg * 2;
  const cardWidth = Math.floor((containerWidth - GRID_GAP) / 2);

  const wideStyle = useMemo((): ViewStyle | undefined => {
    if (!isWide) return undefined;
    return { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" };
  }, [isWide, contentMaxWidth]);

  const menuOptions = useMemo((): ActionSheetOption[] => {
    if (!menuRow) return [];
    const row = menuRow;
    return [
      {
        key: "edit",
        label: "Edit entry",
        icon: <IconPencil color={theme.text} size={22} />,
        onPress: () => router.push(`/garage-item/${row.id}`),
      },
      {
        key: "photo",
        label: "Add a photo",
        icon: <MaterialCommunityIcons name="camera-plus-outline" size={22} color={theme.text} />,
        onPress: () => router.push(`/garage-item/${row.id}/photo`),
      },
      {
        key: "reference",
        label: "View reference",
        icon: <MaterialCommunityIcons name="card-text-outline" size={22} color={theme.text} />,
        onPress: () => router.push(`/car/${row.car_id}`),
      },
      {
        key: "remove",
        label: "Remove from garage",
        icon: <IconTrash color={theme.danger} size={22} />,
        destructive: true,
        onPress: () => requestRemove(row),
      },
    ];
  }, [menuRow, requestRemove]);

  const sortOptions = useMemo(
    (): ActionSheetOption[] =>
      SORTS.map((key) => ({
        key,
        label: GARAGE_SORT_LABELS[key],
        selected: sort === key,
        onPress: () => setSort(key),
      })),
    [sort],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.statRow}>
          <StatTile value={stats.byStatus.Owned + stats.byStatus.Duplicate} label="Owned" color={theme.officialText} />
          <StatTile value={stats.byStatus.Want} label="Wanted" color={theme.rlcText} />
          <StatTile value={stats.hunts} label="Hunts" color={theme.trackYellow} />
        </View>

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push("/garage-insights")}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Open garage insights"
          >
            <MaterialCommunityIcons name="chart-box-outline" size={20} color={theme.accentSecondary} />
            <Text style={styles.linkBtnTxt}>Insights</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/collector-progress")}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Open collector progress"
          >
            <MaterialCommunityIcons name="trophy-outline" size={20} color={theme.accentSecondary} />
            <Text style={styles.linkBtnTxt}>Progress</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </Pressable>
        </View>

        {hasItems ? (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={theme.textMuted} />
                <TextInput
                  placeholder="Search your garage"
                  value={filters.q}
                  onChangeText={(q) => setFilters((f) => ({ ...f, q }))}
                  style={[styles.searchInput, Platform.OS === "web" && webInputOutline]}
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Search your garage"
                />
                {filters.q ? (
                  <Pressable
                    onPress={() => setFilters((f) => ({ ...f, q: "" }))}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <MaterialCommunityIcons name="close-circle" size={18} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={toggleViewMode}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
              >
                <MaterialCommunityIcons
                  name={viewMode === "grid" ? "view-list-outline" : "view-grid-outline"}
                  size={22}
                  color={theme.text}
                />
              </Pressable>
            </View>

            <ScrollView
              {...themedScrollIndicatorProps}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {STATUS_FILTERS.map((s) => (
                <FilterChip
                  key={s.key}
                  label={s.label}
                  selected={filters.status === s.key}
                  onPress={() => setFilters((f) => ({ ...f, status: s.key }))}
                  a11yLabel={`Status filter: ${s.label}`}
                  selectedTint={s.key === "all" ? NEUTRAL_CHIP_TINT : garageStatusChipTint[s.key]}
                />
              ))}
              {stats.hunts > 0 ? (
                <FilterChip
                  label="Treasure Hunts"
                  selected={filters.huntsOnly}
                  onPress={() => setFilters((f) => ({ ...f, huntsOnly: !f.huntsOnly }))}
                  a11yLabel="Show Treasure Hunts only"
                  selectedTint={HUNT_CHIP_TINT}
                />
              ) : null}
              {stats.lines.length > 1
                ? stats.lines.map((line) => (
                    <FilterChip
                      key={line}
                      label={LINE_LABELS[line]}
                      selected={filters.line === line}
                      onPress={() =>
                        setFilters((f) => ({ ...f, line: f.line === line ? "all" : line }))
                      }
                      a11yLabel={`Line filter: ${LINE_LABELS[line]}`}
                      selectedTint={NEUTRAL_CHIP_TINT}
                    />
                  ))
                : null}
            </ScrollView>

            <View style={styles.resultRow}>
              <Text style={styles.resultTxt} accessibilityLiveRegion="polite">
                {filtersActive
                  ? `${visibleItems.length} of ${stats.total} cars`
                  : `${stats.total} car${stats.total === 1 ? "" : "s"}`}
              </Text>
              <Pressable
                onPress={() => setSortSheetOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.sortBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${GARAGE_SORT_LABELS[sort]}`}
              >
                <MaterialCommunityIcons name="sort" size={18} color={theme.textSecondary} />
                <Text style={styles.sortBtnTxt}>{GARAGE_SORT_LABELS[sort]}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    ),
    [stats, hasItems, filters, filtersActive, visibleItems.length, sort, viewMode, toggleViewMode],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UserCarDto; index: number }) => (
      <GarageCard item={item} index={index} mode={viewMode} width={cardWidth} onOpenMenu={setMenuRow} />
    ),
    [viewMode, cardWidth],
  );

  const listEmpty = useMemo(() => {
    if (garageQuery.isLoading) return <LoadingSkeleton cardWidth={cardWidth} />;
    if (garageQuery.isError && !garageQuery.data) return null;
    if (hasItems) {
      return (
        <View style={styles.empty}>
          <IconCarSearchLarge color={theme.textMuted} size={40} />
          <Text style={styles.emptyTitle}>No cars match</Text>
          <Text style={styles.emptyBody}>Try a different search or clear the filters.</Text>
          <View style={styles.emptyActions}>
            <PrimaryButton label="Clear filters" variant="ghost" onPress={clearFilters} />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={styles.emptyArt}>
          <IconPackage color={theme.accentSecondary} size={48} />
        </View>
        <Text style={styles.emptyTitle}>Your garage is empty</Text>
        <Text style={styles.emptyBody}>
          Scan a barcode in the aisle or browse the catalog, then save cars here to track what you own and want.
        </Text>
        <View style={styles.emptyActions}>
          <PrimaryButton
            label="Scan a car"
            icon={<IconBarcodeScan color="#fff" size={22} />}
            onPress={() => router.push("/scan")}
          />
          <PrimaryButton label="Browse catalog" variant="ghost" onPress={() => router.push("/")} />
        </View>
      </View>
    );
  }, [garageQuery.isLoading, garageQuery.isError, garageQuery.data, hasItems, cardWidth, clearFilters]);

  const isGrid = viewMode === "grid";

  return (
    <View style={styles.screen}>
      <OfflineBanner online={online} pendingGarageOps={pendingGarage} />
      {garageQuery.isError && !garageQuery.data ? (
        <View style={[styles.bannerErr, wideStyle]}>
          <IconCloudOff color={theme.danger} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerErrTxt}>Could not load garage</Text>
            <Text style={[styles.bannerErrTxt, { opacity: 0.85, fontWeight: "600", marginTop: 2 }]}>
              {garageQuery.error instanceof Error ? garageQuery.error.message : "Unknown error"}
            </Text>
          </View>
          <Pressable
            onPress={() => void garageQuery.refetch()}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading garage"
          >
            <Text style={styles.retryBtnTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        {...themedScrollIndicatorProps}
        // numColumns cannot change on a mounted FlatList
        key={viewMode}
        data={visibleItems}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? styles.gridRow : undefined}
        ListHeaderComponent={listHeader}
        keyboardShouldPersistTaps="handled"
        refreshing={garageQuery.isRefetching}
        onRefresh={() => void garageQuery.refetch()}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(theme.space2xl, listBottomPad) },
          wideStyle,
        ]}
      />
      <ActionSheet
        visible={menuRow != null}
        title={menuRow?.car?.casting_name ?? "Garage entry"}
        options={menuOptions}
        onClose={() => setMenuRow(null)}
      />
      <ActionSheet
        visible={sortSheetOpen}
        title="Sort by"
        options={sortOptions}
        onClose={() => setSortSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { paddingHorizontal: theme.spaceLg, paddingTop: theme.spaceMd },
  pressed: { opacity: 0.8 },

  header: { marginBottom: theme.spaceMd },
  statRow: { flexDirection: "row", gap: theme.spaceSm },
  statTile: {
    flex: 1,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  statValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  statLabel: { ...theme.typeKicker, fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  linkRow: { flexDirection: "row", gap: theme.spaceSm, marginTop: theme.spaceSm },
  linkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    minHeight: theme.touchTargetMin,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  linkBtnTxt: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.text },

  searchRow: { flexDirection: "row", gap: theme.spaceSm, marginTop: theme.spaceLg },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    minHeight: 48,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgElevated,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, color: theme.text, paddingVertical: 10 },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgElevated,
  },
  chipScroll: { flexGrow: 0, marginTop: theme.spaceMd, marginHorizontal: -theme.spaceLg },
  chipScrollContent: { paddingHorizontal: theme.spaceLg, alignItems: "center" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spaceXs,
  },
  resultTxt: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: theme.touchTargetMin - 8,
  },
  sortBtnTxt: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },

  gridRow: { gap: GRID_GAP },
  card: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    marginBottom: GRID_GAP,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  cardList: { width: "100%" },
  gridMain: { flex: 1 },
  listMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
    paddingRight: theme.touchTargetMin + theme.spaceSm,
  },
  gridImageWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: theme.bgSubtle },
  listImageWrap: {
    width: 104,
    height: 78,
    borderRadius: theme.radiusSm,
    overflow: "hidden",
    backgroundColor: theme.bgSubtle,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholderIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  imageBadgeTopLeft: { position: "absolute", top: theme.spaceSm, left: theme.spaceSm },
  qtyBadge: {
    position: "absolute",
    bottom: theme.spaceSm,
    left: theme.spaceSm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(7, 20, 34, 0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderSticker,
  },
  qtyTxt: { fontSize: 12, fontWeight: "800", color: theme.text },
  gridBody: { padding: theme.spaceMd, gap: 4 },
  listBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: theme.text, letterSpacing: -0.2 },
  // Two lines reserved so cards in a row stay the same height
  cardTitleGrid: { fontSize: 15, lineHeight: 20, minHeight: 40 },
  cardMeta: { color: theme.textSecondary, fontSize: 13, fontWeight: "600" },
  cardPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spaceSm,
    marginTop: 4,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radiusFull,
  },
  statusTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  menuBtn: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnGrid: {
    top: theme.spaceSm,
    right: theme.spaceSm,
    backgroundColor: "rgba(7, 20, 34, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderSticker,
  },
  menuBtnList: { top: theme.spaceSm, right: theme.spaceSm },
  menuBtnPressed: { opacity: 0.7 },

  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  skeletonCard: { marginBottom: 0, opacity: 0.6 },
  skeletonLine: { height: 12, borderRadius: theme.radiusSm, backgroundColor: theme.bgSubtle, marginTop: 4 },

  empty: {
    alignItems: "center",
    marginTop: theme.space2xl,
    gap: theme.spaceSm,
    paddingHorizontal: theme.spaceLg,
  },
  emptyArt: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
    marginBottom: theme.spaceSm,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: theme.text, letterSpacing: -0.3 },
  emptyBody: {
    color: theme.textSecondary,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    maxWidth: 340,
  },
  emptyActions: { alignSelf: "stretch", gap: theme.spaceSm, marginTop: theme.spaceMd },

  bannerErr: {
    flexDirection: "row",
    gap: theme.spaceSm,
    alignItems: "center",
    marginHorizontal: theme.spaceLg,
    marginTop: theme.spaceSm,
    padding: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.danger + "44",
  },
  bannerErrTxt: { color: theme.danger, fontWeight: "700", fontSize: 14, lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 6,
    borderRadius: theme.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.danger,
  },
  retryBtnTxt: { color: theme.danger, fontWeight: "800", fontSize: 13 },
});
