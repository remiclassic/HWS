import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { LineType, UserCarDto, UserCarStatus } from "@hotwheels/shared";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CarRow } from "../../components/ui/CarRow";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListRow } from "../../components/ui/ListRow";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { CarListSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useGarageQueueDepth } from "../../hooks/useGarageQueueDepth";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { deleteGarageItem, fetchGarage } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import { enqueueGarageOp, isTransientNetworkError } from "../../lib/garageMutationQueue";
import { getIsOnline, useOnline } from "../../lib/network";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const LIST_BELOW_TAB_EXTRA = 12;

type StatusFilter = "all" | UserCarStatus;

const statusStyle: Record<UserCarStatus, { bg: string; fg: string; label: string }> = {
  Owned: { bg: theme.officialBg, fg: theme.officialText, label: "Owned" },
  Want: { bg: theme.rlcBg, fg: theme.rlcText, label: "Want" },
  Duplicate: { bg: theme.communityBg, fg: theme.communityText, label: "Dupe" },
};

const EMPTY_BY_FILTER: Record<UserCarStatus, { title: string; body: string }> = {
  Owned: { title: "Nothing owned yet", body: "Cars you mark as Owned show up here." },
  Want: { title: "Your want list is empty", body: "Mark a casting as Want to keep it on your radar." },
  Duplicate: { title: "No duplicates logged", body: "Track spares here so you know what’s up for trade." },
};

const LINE_LABEL: Record<LineType, string> = {
  Mainline: "Mainline",
  Premium: "Premium",
  RLC: "RLC",
  TeamTransport: "Team Transport",
  Entertainment: "Entertainment",
  Other: "Other",
};

/** Line goes in the meta text here — the chip row is reserved for hunt + status. */
function rowMeta(item: UserCarDto): string {
  const parts: string[] = [];
  if (item.car) parts.push(String(item.car.year), LINE_LABEL[item.car.line_type]);
  if (item.status !== "Want") parts.push(item.condition);
  return parts.join(" · ");
}

export default function GarageScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const online = useOnline();
  const pendingGarage = useGarageQueueDepth();
  const toast = useToast();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [menuFor, setMenuFor] = useState<UserCarDto | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const qc = useQueryClient();
  const garageQuery = useQuery({
    queryKey: ["garage"] as const,
    queryFn: fetchGarage,
  });

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
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      toast.show(
        res.queued
          ? { kind: "info", message: "Offline — removal will sync when you’re back online." }
          : { message: "Removed from garage" },
      );
    },
    onError: (e) => toast.show({ kind: "error", message: errorMessage(e) }),
  });

  const allItems = useMemo(() => garageQuery.data?.items ?? [], [garageQuery.data?.items]);

  const counts = useMemo(() => {
    const c: Record<UserCarStatus, number> = { Owned: 0, Want: 0, Duplicate: 0 };
    for (const it of allItems) c[it.status] += 1;
    return c;
  }, [allItems]);

  const items = useMemo(
    () => (filter === "all" ? allItems : allItems.filter((i) => i.status === filter)),
    [allItems, filter],
  );

  const filterOptions = useMemo(
    () =>
      [
        { key: "all", label: "All", count: allItems.length },
        { key: "Owned", label: "Owned", count: counts.Owned },
        { key: "Want", label: "Want", count: counts.Want },
        { key: "Duplicate", label: "Dupes", count: counts.Duplicate },
      ] as const,
    [allItems.length, counts],
  );

  const openMenu = useCallback((row: UserCarDto) => {
    void Haptics.selectionAsync();
    setConfirmingRemove(false);
    setMenuFor(row);
  }, []);

  const closeMenu = useCallback(() => setMenuFor(null), []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void garageQuery.refetch().finally(() => setRefreshing(false));
  }, [garageQuery]);

  const wideColumnStyle = useMemo((): ViewStyle | undefined => {
    if (!isWide) return undefined;
    return { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" };
  }, [isWide, contentMaxWidth]);

  const hasItems = allItems.length > 0;

  const listHeader = useMemo(
    () =>
      hasItems ? (
        <View style={styles.header}>
          <View style={styles.shortcuts}>
            <Pressable
              onPress={() => router.push("/garage-insights")}
              style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open garage insights"
            >
              <MaterialCommunityIcons name="chart-box-outline" size={20} color={theme.accentSecondary} />
              <Text style={styles.shortcutTxt}>Insights</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/collector-progress")}
              style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open collector progress"
            >
              <MaterialCommunityIcons name="trophy-outline" size={20} color={theme.trackYellow} />
              <Text style={styles.shortcutTxt}>Progress</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          </View>
          <SegmentedControl
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            accessibilityLabel="Filter garage by status"
          />
        </View>
      ) : null,
    [hasItems, filterOptions, filter],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UserCarDto; index: number }) => {
      const car = item.car;
      const name = car?.casting_name ?? "Car";
      const st = statusStyle[item.status];
      return (
        <CarRow
          index={index}
          title={name}
          meta={rowMeta(item)}
          imageUri={item.photos?.[0]?.url ?? car?.primary_image_url}
          hunt={car?.treasure_hunt_type}
          badge={
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusTxt, { color: st.fg }]}>
                {st.label}
                {item.status !== "Want" && item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </Text>
            </View>
          }
          trailing={
            <Pressable
              onPress={() => openMenu(item)}
              style={({ pressed }) => [styles.moreBtn, pressed && styles.moreBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`More actions for ${name}`}
            >
              <MaterialCommunityIcons name="dots-vertical" size={22} color={theme.textSecondary} />
            </Pressable>
          }
          onPress={() => router.push(`/garage-item/${item.id}`)}
          onLongPress={() => openMenu(item)}
          accessibilityLabel={`${name}, ${st.label}. Edit garage entry`}
        />
      );
    },
    [openMenu],
  );

  const listEmpty = useMemo(() => {
    if (garageQuery.isLoading) return <CarListSkeleton count={4} />;
    if (garageQuery.isError && !hasItems) {
      return (
        <EmptyState
          icon="cloud-off-outline"
          tone="danger"
          title="Couldn’t load your garage"
          body={errorMessage(garageQuery.error)}
        >
          <PrimaryButton label="Try again" onPress={() => void garageQuery.refetch()} />
        </EmptyState>
      );
    }
    if (filter !== "all") {
      const copy = EMPTY_BY_FILTER[filter];
      return (
        <EmptyState icon="garage-open-variant" title={copy.title} body={copy.body}>
          <PrimaryButton label="Show everything" variant="ghost" onPress={() => setFilter("all")} />
        </EmptyState>
      );
    }
    return (
      <EmptyState
        icon="garage-open-variant"
        title="Your garage is empty"
        body="Find a casting, then save it as Owned, Want, or Duplicate to start tracking your collection."
      >
        <PrimaryButton label="Browse the catalog" onPress={() => router.navigate("/(tabs)")} />
        <PrimaryButton label="Scan a barcode" variant="ghost" onPress={() => router.push("/scan")} />
      </EmptyState>
    );
  }, [garageQuery, hasItems, filter]);

  const menuName = menuFor?.car?.casting_name ?? "Car";

  return (
    <View style={styles.screen}>
      <OfflineBanner online={online} pendingGarageOps={pendingGarage} />
      {garageQuery.isError && hasItems ? (
        <View style={[styles.staleBanner, wideColumnStyle]} accessibilityRole="alert">
          <MaterialCommunityIcons name="cloud-off-outline" size={18} color={theme.rumorText} />
          <Text style={styles.staleBannerTxt}>Showing your last synced garage — couldn’t refresh.</Text>
        </View>
      ) : null}
      <FlatList
        {...themedScrollIndicatorProps}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accentSecondary}
            colors={[theme.accentSecondary]}
            progressBackgroundColor={theme.bgElevated}
          />
        }
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarHeight + LIST_BELOW_TAB_EXTRA },
          wideColumnStyle,
        ]}
      />

      <BottomSheet
        visible={menuFor != null}
        onClose={closeMenu}
        title={confirmingRemove ? "Remove from garage?" : menuName}
        subtitle={
          confirmingRemove
            ? `${menuName} and its notes and photos will be removed from your garage.`
            : undefined
        }
        footer={
          confirmingRemove ? (
            <>
              <PrimaryButton
                label="Remove"
                variant="danger"
                onPress={() => {
                  if (menuFor) del.mutate(menuFor.id);
                  closeMenu();
                }}
              />
              <PrimaryButton label="Keep it" variant="ghost" onPress={() => setConfirmingRemove(false)} />
            </>
          ) : undefined
        }
      >
        {confirmingRemove || !menuFor ? null : (
          <View style={styles.menu}>
            <ListRow
              icon="pencil-outline"
              title="Edit entry"
              subtitle="Status, condition, quantity, notes, photos"
              onPress={() => {
                closeMenu();
                router.push(`/garage-item/${menuFor.id}`);
              }}
            />
            <ListRow
              divider
              icon="book-open-variant"
              title="View reference"
              subtitle="Catalog details and sources"
              onPress={() => {
                closeMenu();
                router.push(`/car/${menuFor.car_id}`);
              }}
            />
            <ListRow
              divider
              icon="trash-can-outline"
              title="Remove from garage"
              tone="danger"
              onPress={() => setConfirmingRemove(true)}
            />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { flexGrow: 1, paddingHorizontal: theme.spaceLg, paddingTop: theme.spaceMd },
  header: { gap: theme.spaceMd, marginBottom: theme.spaceLg },
  shortcuts: { flexDirection: "row", gap: theme.spaceSm },
  shortcut: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    minHeight: 48,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  shortcutPressed: { backgroundColor: theme.bgRaised },
  shortcutTxt: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.text },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radiusFull,
  },
  statusTxt: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  moreBtn: {
    width: theme.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: theme.radiusMd,
    borderBottomRightRadius: theme.radiusMd,
  },
  moreBtnPressed: { backgroundColor: theme.bgRaised },
  menu: {
    marginHorizontal: -theme.spaceLg,
  },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceSm,
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceLg,
    backgroundColor: theme.rumorBg,
  },
  staleBannerTxt: { flex: 1, fontSize: 13, fontWeight: "600", color: theme.rumorText },
});
