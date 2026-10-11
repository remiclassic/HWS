import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  DEFAULT_GARAGE_ENTRY,
  GarageEntryForm,
  type GarageEntryDraft,
} from "../../../components/garage/GarageEntryForm";
import { EmptyState } from "../../../components/ui/EmptyState";
import { HuntBadge } from "../../../components/ui/HuntBadge";
import { LineChip } from "../../../components/ui/LineChip";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { errorMessage } from "../../../lib/errors";
import { useResponsiveLayout } from "../../../hooks/useResponsiveLayout";
import { OfflineBanner } from "../../../components/ui/OfflineBanner";
import { useGarageQueueDepth } from "../../../hooks/useGarageQueueDepth";
import { deleteGarageItemPhoto, fetchGarage, patchGarageItem } from "../../../lib/api";
import { enqueueGarageOp, isTransientNetworkError } from "../../../lib/garageMutationQueue";
import { getIsOnline, useOnline } from "../../../lib/network";
import { theme, themedScrollIndicatorProps } from "../../../lib/theme";

const THUMB = 96;

export default function GarageItemEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rowId = typeof id === "string" ? id : "";
  const insets = useSafeAreaInsets();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const qc = useQueryClient();
  const online = useOnline();
  const pendingGarage = useGarageQueueDepth();
  const toast = useToast();

  const garageQuery = useQuery({
    queryKey: ["garage"] as const,
    queryFn: fetchGarage,
  });

  const row = useMemo(
    () => garageQuery.data?.items.find((i) => i.id === rowId),
    [garageQuery.data?.items, rowId],
  );

  const [draft, setDraft] = useState<GarageEntryDraft>(DEFAULT_GARAGE_ENTRY);

  useEffect(() => {
    if (row) {
      setDraft({
        status: row.status,
        condition: row.condition,
        quantity: row.quantity,
        notes: row.notes ?? "",
      });
    }
  }, [row]);

  const dirty =
    row != null &&
    (draft.status !== row.status ||
      draft.condition !== row.condition ||
      draft.quantity !== row.quantity ||
      draft.notes.trim() !== (row.notes ?? ""));

  const patch = useMutation({
    mutationFn: async () => {
      const body = {
        status: draft.status,
        condition: draft.condition,
        quantity: draft.quantity,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
      };
      try {
        await patchGarageItem(rowId, body);
        return { queued: false as const };
      } catch (e) {
        const likelyOffline = !(await getIsOnline());
        if (likelyOffline || isTransientNetworkError(e)) {
          await enqueueGarageOp({ v: 1, kind: "patch", id: rowId, body });
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(
        res.queued
          ? { kind: "info", message: "Offline — changes will sync when you’re back online." }
          : { message: "Garage entry saved" },
      );
      router.back();
    },
    onError: (e) => toast.show({ kind: "error", message: errorMessage(e) }),
  });

  const delPhoto = useMutation({
    mutationFn: async (photoId: string) => {
      try {
        await deleteGarageItemPhoto(rowId, photoId);
        return { queued: false as const };
      } catch (e) {
        const likelyOffline = !(await getIsOnline());
        if (likelyOffline || isTransientNetworkError(e)) {
          await enqueueGarageOp({ v: 1, kind: "deletePhoto", garageItemId: rowId, photoId });
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(
        res.queued
          ? { kind: "info", message: "Offline — photo removal will sync later." }
          : { message: "Photo removed" },
      );
    },
    onError: (e) => toast.show({ kind: "error", message: errorMessage(e) }),
  });

  const confirmRemovePhoto = useCallback(
    (photoId: string) => {
      Alert.alert("Remove photo?", "This deletes the image from your garage entry.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => delPhoto.mutate(photoId),
        },
      ]);
    },
    [delPhoto],
  );

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  if (garageQuery.isLoading) {
    return (
      <View style={[styles.root, styles.scroll, styles.loading]} accessibilityLabel="Loading garage entry">
        <Skeleton height={84} radius={theme.radiusMd} />
        <Skeleton width={THUMB} height={THUMB} radius={theme.radiusMd} />
        <Skeleton height={46} radius={theme.radiusMd} />
        <Skeleton height={46} radius={theme.radiusMd} />
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="car-off"
          title="Entry not found"
          body="It may have been removed. Head back to your garage and pull to refresh."
        >
          <PrimaryButton label="Back to garage" variant="ghost" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  const car = row.car;
  const photos = row.photos ?? [];

  return (
    <View style={styles.root}>
      <OfflineBanner online={online} pendingGarageOps={pendingGarage} />
      <ScrollView
        {...themedScrollIndicatorProps}
        contentContainerStyle={[styles.scroll, wideColumn]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Pressable
          onPress={() => router.push(`/car/${row.car_id}`)}
          style={({ pressed }) => [styles.headerCard, pressed && styles.headerCardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${car?.casting_name ?? "Car"}. View reference`}
        >
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>
              {car?.casting_name ?? "Car"}
            </Text>
            {car ? (
              <>
                <Text style={styles.meta}>
                  {car.year}
                  {car.series ? ` · ${car.series}` : ""}
                </Text>
                <View style={styles.chipRow}>
                  <LineChip line={car.line_type} tooltip={false} />
                  <HuntBadge type={car.treasure_hunt_type} tooltip={false} />
                </View>
              </>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textMuted} />
        </Pressable>

        <Text style={styles.chipLabel}>Your photos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
          style={styles.photoStripWrap}
        >
          <Pressable
            style={styles.addPhotoTile}
            onPress={() => router.push(`/garage-item/${rowId}/photo`)}
            accessibilityRole="button"
            accessibilityLabel="Take or add a photo"
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.accentSecondary} />
            <Text style={styles.addPhotoTxt}>Add photo</Text>
          </Pressable>
          {photos.map((p) => (
            <View key={p.id} style={styles.thumbWrap}>
              <ExpoImage
                source={{ uri: p.url }}
                style={styles.thumb}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                accessibilityLabel="Garage photo"
              />
              <Pressable
                style={styles.thumbRemove}
                onPress={() => confirmRemovePhoto(p.id)}
                disabled={delPhoto.isPending}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <MaterialCommunityIcons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <GarageEntryForm value={draft} onChange={setDraft} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spaceMd }]}>
        <View style={[styles.footerInner, wideColumn]}>
          <PrimaryButton
            label="Save changes"
            onPress={() => patch.mutate()}
            loading={patch.isPending}
            disabled={!dirty}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: theme.spaceLg, paddingBottom: theme.space2xl },
  center: { flex: 1, justifyContent: "center", backgroundColor: theme.bg },
  loading: { gap: theme.spaceLg },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceLg,
    marginBottom: theme.spaceXl,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  headerCardPressed: { backgroundColor: theme.bgRaised },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...theme.typeTitleMd, color: theme.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginTop: theme.spaceSm },
  meta: { marginTop: 4, color: theme.textSecondary, fontSize: 15, fontWeight: "600" },
  chipLabel: { fontSize: 14, fontWeight: "700", color: theme.textSecondary, marginBottom: theme.spaceSm },
  photoStripWrap: { flexGrow: 0 },
  photoStrip: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm, paddingRight: theme.spaceLg },
  addPhotoTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radiusMd,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(45, 212, 191, 0.45)",
    backgroundColor: theme.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoTxt: { fontSize: 12, fontWeight: "800", color: theme.accentSecondary },
  thumbWrap: { position: "relative" },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.border,
  },
  thumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bgElevated,
    paddingTop: theme.spaceMd,
  },
  footerInner: { paddingHorizontal: theme.spaceLg },
});
