import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { UserCarCondition, UserCarStatus } from "@hotwheels/shared";
import { Card } from "../../../components/ui/Card";
import { ConfidenceBar } from "../../../components/ui/ConfidenceBar";
import { FilterChip } from "../../../components/ui/FilterChip";
import { HuntBadge } from "../../../components/ui/HuntBadge";
import { LineChip } from "../../../components/ui/LineChip";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { useResponsiveLayout } from "../../../hooks/useResponsiveLayout";
import { deleteGarageItemPhoto, fetchGarage, patchGarageItem } from "../../../lib/api";
import { resolveApiAssetUrl } from "../../../lib/config";
import { garageConditionChipTint, garageStatusChipTint } from "../../../lib/garageFormChips";
import { theme, themedScrollIndicatorProps } from "../../../lib/theme";

const STATUSES: UserCarStatus[] = ["Owned", "Want", "Duplicate"];
const CONDITIONS: UserCarCondition[] = ["Carded", "Loose", "Custom"];
const THUMB = 96;

export default function GarageItemEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rowId = typeof id === "string" ? id : "";
  const insets = useSafeAreaInsets();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const qc = useQueryClient();

  const garageQuery = useQuery({
    queryKey: ["garage"] as const,
    queryFn: fetchGarage,
  });

  const row = useMemo(
    () => garageQuery.data?.items.find((i) => i.id === rowId),
    [garageQuery.data?.items, rowId],
  );

  const [status, setStatus] = useState<UserCarStatus>("Owned");
  const [condition, setCondition] = useState<UserCarCondition>("Carded");
  const [quantityStr, setQuantityStr] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (row) {
      setStatus(row.status);
      setCondition(row.condition);
      setQuantityStr(String(row.quantity));
      setNotes(row.notes ?? "");
    }
  }, [row]);

  const patch = useMutation({
    mutationFn: () =>
      patchGarageItem(rowId, {
        status,
        condition,
        quantity: Math.max(1, Math.min(999, parseInt(quantityStr, 10) || 1)),
        notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Updated", "Garage entry saved");
      router.back();
    },
    onError: (e) => Alert.alert("Could not save", String(e)),
  });

  const delPhoto = useMutation({
    mutationFn: (photoId: string) => deleteGarageItemPhoto(rowId, photoId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => Alert.alert("Could not remove photo", String(e)),
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

  if (!rowId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Missing garage item.</Text>
      </View>
    );
  }

  if (garageQuery.isLoading || !garageQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="car-off" size={36} color={theme.textMuted} />
        <Text style={styles.error}>Item not found.</Text>
        <Text style={styles.muted}>Pull to refresh My Garage and try again.</Text>
      </View>
    );
  }

  const car = row.car;
  const photos = row.photos ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        {...themedScrollIndicatorProps}
        contentContainerStyle={[styles.scroll, wideColumn]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Card style={styles.headerCard}>
          <Text style={styles.title}>{car?.casting_name ?? "Car"}</Text>
          {car ? (
            <>
              <View style={styles.chipRow}>
                <LineChip line={car.line_type} />
                <HuntBadge type={car.treasure_hunt_type} />
              </View>
              <Text style={styles.meta}>
                {car.year}
                {car.series ? ` · ${car.series}` : ""}
              </Text>
              <ConfidenceBar score={car.confidence_score} label="Confidence" />
            </>
          ) : null}
        </Card>

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
            <MaterialCommunityIcons name="camera-plus-outline" size={32} color={theme.accentSecondary} />
            <Text style={styles.addPhotoTxt}>Add</Text>
          </Pressable>
          {photos.map((p) => (
            <View key={p.id} style={styles.thumbWrap}>
              <Image
                source={{ uri: resolveApiAssetUrl(p.url) }}
                style={styles.thumb}
                accessibilityLabel="Garage photo"
              />
              <Pressable
                style={styles.thumbRemove}
                onPress={() => confirmRemovePhoto(p.id)}
                disabled={delPhoto.isPending}
                accessibilityLabel="Remove photo"
              >
                <MaterialCommunityIcons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.chipLabel}>Status</Text>
        <View style={styles.chipWrap}>
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={s}
              selected={status === s}
              onPress={() => setStatus(s)}
              a11yLabel={`Garage status: ${s}`}
              selectedTint={garageStatusChipTint[s]}
            />
          ))}
        </View>

        <Text style={styles.chipLabel}>Condition</Text>
        <View style={styles.chipWrap}>
          {CONDITIONS.map((c) => (
            <FilterChip
              key={c}
              label={c}
              selected={condition === c}
              onPress={() => setCondition(c)}
              a11yLabel={`Condition: ${c}`}
              selectedTint={garageConditionChipTint[c]}
            />
          ))}
        </View>

        <Text style={styles.chipLabel}>Quantity</Text>
        <TextInput
          value={quantityStr}
          onChangeText={setQuantityStr}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="1"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={styles.chipLabel}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, styles.notesInput]}
          placeholder="Purchase notes, location, trades…"
          placeholderTextColor={theme.textMuted}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spaceMd }]}>
        <View style={[styles.footerInner, wideColumn]}>
          <PrimaryButton
            label={patch.isPending ? "Saving…" : "Save changes"}
            onPress={() => patch.mutate()}
            loading={patch.isPending}
            icon={<MaterialCommunityIcons name="content-save-outline" size={22} color="#fff" />}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: theme.spaceLg, paddingBottom: theme.space2xl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
    padding: theme.spaceXl,
    gap: theme.spaceSm,
  },
  headerCard: { marginBottom: theme.spaceLg },
  title: { ...theme.typeTitleLg, color: theme.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginTop: theme.spaceSm },
  meta: { marginTop: theme.spaceSm, color: theme.textSecondary, fontSize: 15, fontWeight: "600" },
  chipLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.textMuted,
    marginBottom: theme.spaceSm,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: theme.spaceLg, gap: 0 },
  photoStripWrap: { marginBottom: theme.spaceLg },
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: theme.bgElevated,
    color: theme.text,
    marginBottom: theme.spaceLg,
  },
  notesInput: { minHeight: 100, textAlignVertical: "top" },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bgElevated,
    paddingTop: theme.spaceMd,
  },
  footerInner: { paddingHorizontal: theme.spaceLg },
  error: { color: theme.danger, fontWeight: "700" },
  muted: { color: theme.textMuted },
});
