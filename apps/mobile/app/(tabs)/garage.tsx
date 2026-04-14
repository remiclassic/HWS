import { memo, useCallback, useMemo } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { IconCloudOff, IconPackage, IconPencil, IconTrash } from "../../components/icons/AppIcons";
import type { UserCarDto } from "@hotwheels/shared";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { LineChip } from "../../components/ui/LineChip";
import { RemoteImage } from "../../components/ui/RemoteImage";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { useGarageQueueDepth } from "../../hooks/useGarageQueueDepth";
import { deleteGarageItem, fetchGarage } from "../../lib/api";
import { enqueueGarageOp, isTransientNetworkError } from "../../lib/garageMutationQueue";
import { getIsOnline, useOnline } from "../../lib/network";
import { motion } from "../../lib/motion";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const LIST_BELOW_TAB_EXTRA = 12;

const statusStyle: Record<string, { bg: string; fg: string }> = {
  Owned: { bg: theme.officialBg, fg: theme.officialText },
  Want: { bg: theme.rlcBg, fg: theme.rlcText },
  Duplicate: { bg: theme.communityBg, fg: theme.communityText },
};

const GarageCardRow = memo(function GarageCardRow({
  item,
  index,
  wideColumnStyle,
  onDelete,
}: {
  item: UserCarDto;
  index: number;
  wideColumnStyle?: ViewStyle;
  onDelete: (row: UserCarDto) => void;
}) {
  const car = item.car;
  const thumbUri = item.photos?.[0]?.url ?? car?.primary_image_url ?? null;
  const st = statusStyle[item.status] ?? statusStyle["Owned"];
  const mainPress = usePressScale(true);
  const editPress = usePressScale(true, motion.scalePressSubtle, motion.springChip);
  const trashPress = usePressScale(true, motion.scalePressSubtle, motion.springChip);

  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(19)
        .stiffness(280)
        .delay(Math.min(index * motion.staggerItemMs, 220))}
      style={[styles.card, wideColumnStyle]}
    >
      <ReanimatedPressable
        onPress={() => router.push(`/car/${item.car_id}`)}
        onPressIn={mainPress.onPressIn}
        onPressOut={mainPress.onPressOut}
        style={[styles.cardMain, mainPress.animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Open reference: ${car?.casting_name ?? "Car"}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <RemoteImage
              uri={thumbUri}
              style={[styles.cardThumb, !thumbUri && styles.cardThumbPlaceholder]}
              accessibilityLabel={thumbUri ? `${car?.casting_name ?? "Car"} photo` : undefined}
            />
            <Text style={styles.cardTitle} numberOfLines={2}>
              {car?.casting_name ?? "Car"}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusTxt, { color: st.fg }]}>{item.status}</Text>
          </View>
        </View>
        {car ? (
          <View style={styles.chipRow}>
            <LineChip line={car.line_type} />
            <HuntBadge type={car.treasure_hunt_type} />
          </View>
        ) : null}
        <Text style={styles.cardMeta}>
          {item.condition} · qty {item.quantity}
          {car?.year ? ` · ${car.year}` : ""}
        </Text>
        {car ? <ConfidenceBar score={car.confidence_score} label="Confidence" /> : null}
      </ReanimatedPressable>
      <View style={styles.cardActions}>
        <ReanimatedPressable
          onPress={() => router.push(`/garage-item/${item.id}`)}
          hitSlop={8}
          onPressIn={editPress.onPressIn}
          onPressOut={editPress.onPressOut}
          style={[styles.actionBtn, editPress.animatedStyle]}
          accessibilityLabel="Edit garage entry"
          accessibilityRole="button"
        >
          <IconPencil color={theme.accent} size={22} />
        </ReanimatedPressable>
        <ReanimatedPressable
          onPress={() => onDelete(item)}
          hitSlop={8}
          onPressIn={trashPress.onPressIn}
          onPressOut={trashPress.onPressOut}
          style={[styles.actionBtn, styles.actionBtnDestructive, trashPress.animatedStyle]}
          accessibilityLabel="Remove from garage"
          accessibilityRole="button"
        >
          <IconTrash color={theme.danger} size={22} />
        </ReanimatedPressable>
      </View>
    </Animated.View>
  );
});

export default function GarageScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const listBottomPad = tabBarHeight + LIST_BELOW_TAB_EXTRA;
  const online = useOnline();
  const pendingGarage = useGarageQueueDepth();

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
      if (res.queued) {
        Alert.alert("Offline", "Remove queued. It will apply when you’re back online.");
      }
    },
    onError: (e) => Alert.alert("Could not remove", String(e)),
  });

  const onDelete = useCallback(
    (row: UserCarDto) => {
      Alert.alert("Remove from garage?", row.car?.casting_name ?? "", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => del.mutate(row.id),
        },
      ]);
    },
    [del],
  );

  const count = garageQuery.data?.items.length ?? 0;

  const wideColumnStyle = useMemo((): ViewStyle | undefined => {
    if (!isWide) return undefined;
    return {
      maxWidth: contentMaxWidth,
      alignSelf: "center",
      width: "100%",
    };
  }, [isWide, contentMaxWidth]);

  const listHeader = useMemo(
    () => (
      <Animated.View entering={FadeInDown.duration(420).delay(30)} style={[styles.header, wideColumnStyle]}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Your collection state</Text>
          <Text style={styles.title}>My Garage</Text>
          <Text style={styles.sub}>
            {count === 0
              ? "Save cars from Spotter. Lists cache on this device after a successful sync; export from the header to keep a backup."
              : `${count} saved item${count === 1 ? "" : "s"} · tap a row for full reference`}
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push("/garage-insights")}
              style={({ pressed }) => [styles.insightsBtn, pressed && styles.insightsBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open garage insights"
            >
              <MaterialCommunityIcons name="chart-box-outline" size={20} color={theme.accent} />
              <Text style={styles.insightsBtnTxt}>Insights</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/collector-progress")}
              style={({ pressed }) => [styles.insightsBtn, pressed && styles.insightsBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open collector progress"
            >
              <MaterialCommunityIcons name="trophy-outline" size={20} color={theme.accent} />
              <Text style={styles.insightsBtnTxt}>Progress</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countTxt}>{count}</Text>
        </View>
      </Animated.View>
    ),
    [count, wideColumnStyle],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UserCarDto; index: number }) => (
      <GarageCardRow item={item} index={index} wideColumnStyle={wideColumnStyle} onDelete={onDelete} />
    ),
    [onDelete, wideColumnStyle],
  );

  return (
    <View style={styles.screen}>
      <OfflineBanner online={online} pendingGarageOps={pendingGarage} />
      {garageQuery.isError && !garageQuery.data ? (
        <View style={[styles.bannerErr, wideColumnStyle]}>
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
        data={garageQuery.data?.items ?? []}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshing={garageQuery.isFetching}
        onRefresh={() => garageQuery.refetch()}
        ListEmptyComponent={
          garageQuery.isLoading ? (
            <Text style={styles.muted}>Loading garage…</Text>
          ) : (
            <View style={[styles.empty, wideColumnStyle]}>
              <IconPackage color={theme.textMuted} size={44} />
              <Text style={styles.emptyTitle}>Garage is empty</Text>
              <Text style={styles.muted}>Open a car reference and tap “Save to garage.”</Text>
            </View>
          )
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(theme.space2xl, listBottomPad) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { paddingHorizontal: theme.spaceLg },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceLg,
    marginBottom: theme.spaceLg,
    marginTop: theme.spaceSm,
  },
  headerText: { flex: 1, minWidth: 0 },
  kicker: {
    ...theme.typeKicker,
    color: theme.accent,
  },
  title: {
    ...theme.typeTitleLg,
    fontSize: 24,
    color: theme.text,
    marginTop: 4,
  },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 22, color: theme.textSecondary, fontWeight: "500" },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spaceSm,
    marginTop: theme.spaceMd,
    alignSelf: "flex-start",
  },
  insightsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  insightsBtnPressed: { opacity: 0.85 },
  insightsBtnTxt: { fontSize: 15, fontWeight: "800", color: theme.accent },
  countBadge: {
    minWidth: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  countTxt: { fontSize: 18, fontWeight: "900", color: theme.text },
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    marginBottom: theme.spaceMd,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  cardMain: { flex: 1, padding: theme.spaceLg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: theme.spaceSm },
  cardTopLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceMd,
  },
  cardThumb: {
    width: 64,
    height: 44,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  cardThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "800", color: theme.text },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radiusFull,
  },
  statusTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginTop: theme.spaceSm },
  cardMeta: { marginTop: theme.spaceSm, color: theme.textSecondary, fontSize: 14, fontWeight: "600" },
  cardActions: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.border,
    backgroundColor: theme.bgSubtle,
    width: theme.touchTargetMin,
    alignItems: "stretch",
  },
  actionBtn: {
    flex: 1,
    minHeight: theme.touchTargetMin - 4,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  actionBtnDestructive: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  muted: { color: theme.textMuted, textAlign: "center", marginTop: theme.spaceMd, fontWeight: "500" },
  empty: {
    alignItems: "center",
    marginTop: theme.space3xl,
    gap: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.text },
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
