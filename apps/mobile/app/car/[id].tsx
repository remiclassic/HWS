import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { SourceRef, TreasureHuntType, UserCarCondition, UserCarStatus } from "@hotwheels/shared";
import { Card } from "../../components/ui/Card";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { FilterChip } from "../../components/ui/FilterChip";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { LineChip } from "../../components/ui/LineChip";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { SourcePill } from "../../components/ui/SourcePill";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { addToGarage, fetchCar } from "../../lib/api";
import { garageConditionChipTint, garageStatusChipTint } from "../../lib/garageFormChips";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const STATUSES: UserCarStatus[] = ["Owned", "Want", "Duplicate"];
const CONDITIONS: UserCarCondition[] = ["Carded", "Loose", "Custom"];

const AttributionEntryRow = memo(function AttributionEntryRow({
  a,
  pill,
}: {
  a: SourceRef;
  pill: ReactNode;
}) {
  const onOpen = useCallback(() => {
    const url = a.source_url;
    if (!url) return;
    void Linking.canOpenURL(url).then((ok) => {
      if (ok) void Linking.openURL(url);
    });
  }, [a.source_url]);

  const showLink = Boolean(a.source_url);

  return (
    <View style={styles.attrRow}>
      {pill}
      <View style={{ flex: 1 }}>
        <Text style={styles.attrSource}>{a.source_name}</Text>
        <Text style={styles.attrField}>{a.field_path}</Text>
        <Text style={styles.attrVal}>{a.value ?? "—"}</Text>
        {showLink ? (
          <Pressable onPress={onOpen} style={styles.sourceLink} accessibilityRole="link">
            <Text style={styles.sourceLinkTxt}>Open source</Text>
            <MaterialCommunityIcons name="open-in-new" size={16} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const TreasureHuntStrip = memo(function TreasureHuntStrip({
  huntType,
  carId,
}: {
  huntType: TreasureHuntType;
  carId: string;
}) {
  const active = huntType !== "None";
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(active);

  const onPress = useCallback(() => {
    if (active) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/th/${carId}`);
    }
  }, [active, carId]);

  return (
    <ReanimatedPressable
      onPress={onPress}
      disabled={!active}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={active ? "Open treasure hunt field guide" : "Not a treasure hunt in reference data"}
      style={[styles.thStrip, active && styles.thStripActive, !active && styles.thStripDisabled, animatedStyle]}
    >
      <View style={styles.thStripLeft}>
        <MaterialCommunityIcons
          name="fire"
          size={22}
          color={active ? theme.accentSecondary : theme.textMuted}
        />
        <View>
          <Text style={styles.thStripLabel}>Treasure Hunt</Text>
          <Text style={styles.thStripValue}>{huntType}</Text>
        </View>
      </View>
      {active ? (
        <View style={styles.thStripCta} pointerEvents="none">
          <Text style={styles.thStripCtaLabel}>Field guide</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.accentSecondary} />
        </View>
      ) : (
        <Text style={styles.thStripHint}>Not a hunt in our data</Text>
      )}
    </ReanimatedPressable>
  );
});

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = typeof id === "string" ? id : "";
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { isWide, contentMaxWidth } = useResponsiveLayout();
  const heroHeight = useMemo(
    () => Math.min(Math.floor((winW / 16) * 9), isWide ? 280 : 240),
    [winW, isWide],
  );
  const qc = useQueryClient();
  const [showSources, setShowSources] = useState(true);
  const [status, setStatus] = useState<UserCarStatus>("Owned");
  const [condition, setCondition] = useState<UserCarCondition>("Carded");
  const [garageNotes, setGarageNotes] = useState("");
  const [quantityStr, setQuantityStr] = useState("1");

  const q = useQuery({
    queryKey: ["car", carId] as const,
    queryFn: () => fetchCar(carId),
    enabled: Boolean(carId),
  });

  const add = useMutation({
    mutationFn: () =>
      addToGarage({
        car_id: carId,
        status,
        condition,
        quantity: Math.max(1, Math.min(999, parseInt(quantityStr, 10) || 1)),
        notes: garageNotes.trim() ? garageNotes.trim() : null,
      }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["garage"] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Saved to My Garage");
    },
    onError: (e) => Alert.alert("Could not save", String(e)),
  });

  const data = q.data;

  const rumorAttributions = useMemo(
    () => (data?.attributions ?? []).filter((a) => a.is_rumor),
    [data?.attributions],
  );

  const officialAttributions = useMemo(
    () => (data?.attributions ?? []).filter((a) => a.source_type === "official" && !a.is_rumor),
    [data?.attributions],
  );

  const communityAttributions = useMemo(
    () =>
      (data?.attributions ?? []).filter((a) => a.source_type === "community" || a.is_rumor),
    [data?.attributions],
  );

  const images = data?.images ?? [];

  if (!carId) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="car-off" size={36} color={theme.textMuted} />
        <Text style={styles.error}>Missing car id.</Text>
        <Text style={styles.mutedSmall}>Go back and pick a reference from search.</Text>
      </View>
    );
  }

  if (q.isLoading || !data) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="timer-sand" size={32} color={theme.textMuted} />
        <Text style={styles.muted}>Loading reference…</Text>
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={36} color={theme.danger} />
        <Text style={styles.error}>Could not load this car.</Text>
        <Text style={styles.mutedSmall}>Check your connection and try again.</Text>
      </View>
    );
  }

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  return (
    <View style={styles.root}>
      <ScrollView
        {...themedScrollIndicatorProps}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.contentInner, wideColumn]}>
          <Animated.View entering={FadeIn.duration(520)} style={styles.heroImgWrap}>
            {images.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={[styles.heroCarousel, { height: heroHeight }]}
              >
                {images.map((im) => (
                  <Image
                    key={im.id}
                    source={{ uri: im.official_image_url }}
                    style={[styles.heroImgPage, { height: heroHeight, width: winW }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.heroImg, styles.heroPlaceholder, { height: heroHeight }]}>
                <MaterialCommunityIcons name="car-side" size={48} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.heroGradient} />
            <View style={styles.heroBar}>
              <View style={styles.heroBarInner}>
                <LineChip line={data.line_type} />
                <HuntBadge type={data.treasure_hunt_type} />
              </View>
            </View>
          </Animated.View>

          <Text style={styles.title}>{data.casting_name}</Text>
          <Text style={styles.meta}>
            {data.year}
            {data.series ? ` · ${data.series}` : ""}
          </Text>

          <ConfidenceBar score={data.confidence_score} />

          {data.last_verified_at ? (
            <Text style={styles.lastVerified}>
              Last verified in catalog{" "}
              {new Date(data.last_verified_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          ) : null}

          <TreasureHuntStrip huntType={data.treasure_hunt_type} carId={carId} />

          {data.description ? (
            <Card style={styles.section}>
              <Text style={styles.body}>{data.description}</Text>
            </Card>
          ) : null}

          {(data.identifiers?.model_number ||
            data.identifiers?.case_code ||
            data.identifiers?.sku) && (
            <Card title="Identifiers" style={styles.section}>
              {data.identifiers.model_number ? (
                <Text style={styles.mono}>Model: {data.identifiers.model_number}</Text>
              ) : null}
              {data.identifiers.case_code ? (
                <Text style={styles.mono}>Case: {data.identifiers.case_code}</Text>
              ) : null}
              {data.identifiers.sku ? (
                <Text style={styles.mono}>SKU: {data.identifiers.sku}</Text>
              ) : null}
            </Card>
          )}

          {data.known_variations.length > 0 ? (
            <Card title="Known variations" style={styles.section}>
              {data.known_variations.map((v) => (
                <View key={v.id} style={styles.varRow}>
                  <View style={styles.varBullet} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.varMain}>
                      {[v.deco, v.wheels, v.region].filter(Boolean).join(" · ")}
                    </Text>
                    {v.notes ? <Text style={styles.varNote}>{v.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show sources</Text>
                <Text style={styles.toggleSub}>Official vs community, rumor callouts</Text>
              </View>
              <Switch
                value={showSources}
                onValueChange={setShowSources}
                trackColor={{ false: theme.border, true: theme.accentMuted }}
                thumbColor={showSources ? theme.accent : theme.bgSubtle}
              />
            </View>
          </View>

          {showSources ? (
            <Card title="Attributions" style={styles.section}>
              <Text style={styles.sectionHint}>Every datapoint traces to a registered source.</Text>
              {officialAttributions.length === 0 ? (
                <Text style={styles.mutedSmall}>No official attributions on file.</Text>
              ) : (
                officialAttributions.map((a) => (
                  <AttributionEntryRow
                    key={`${a.source_id}-${a.field_path}`}
                    a={a}
                    pill={<SourcePill kind="official" />}
                  />
                ))
              )}
              <Text style={[styles.subhead, { marginTop: theme.spaceLg }]}>Community & rumors</Text>
              {communityAttributions.length === 0 ? (
                <Text style={styles.mutedSmall}>None listed.</Text>
              ) : (
                communityAttributions.map((a) => (
                  <AttributionEntryRow
                    key={`${a.source_id}-${a.field_path}-c`}
                    a={a}
                    pill={<SourcePill kind={a.is_rumor ? "rumor" : "community"} />}
                  />
                ))
              )}
              {rumorAttributions.length > 0 ? (
                <View style={styles.rumorBanner}>
                  <MaterialCommunityIcons name="alert-outline" size={18} color={theme.rumorText} />
                  <Text style={styles.rumorBannerTxt}>
                    Rumors are unverified — always confirm on card or sealed packaging.
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {data.community_notes.length > 0 ? (
            <Card title="Community notes" style={styles.section}>
              <Text style={styles.sectionHint}>Read-only. Not editable in v1.</Text>
              {data.community_notes.map((n) => (
                <View key={n.id} style={styles.note}>
                  <Text style={styles.noteBody}>{n.body}</Text>
                  <Text style={styles.noteMeta}>
                    Source: {n.source_name}
                    {n.is_official ? " · official label" : " · non-official"}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          <Card title="Add to My Garage" style={[styles.section, styles.garageSection]}>
            <Text style={styles.sectionHint}>Pick how this copy fits your collection.</Text>
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
              style={styles.garageInput}
              placeholder="1"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.chipLabel}>Notes</Text>
            <TextInput
              value={garageNotes}
              onChangeText={setGarageNotes}
              style={[styles.garageInput, styles.garageNotesInput]}
              placeholder="Optional — where you found it, trades, condition detail…"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </Card>
        </View>
      </ScrollView>
      <View
        style={[
          styles.saveFooter,
          {
            paddingBottom: insets.bottom + theme.spaceMd,
          },
        ]}
      >
        <View style={[styles.saveFooterInner, wideColumn]}>
          <PrimaryButton
            label={add.isPending ? "Saving…" : "Save to garage"}
            onPress={() => add.mutate()}
            loading={add.isPending}
            icon={
              <MaterialCommunityIcons name="bookmark-plus-outline" size={22} color="#fff" />
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spaceMd,
    backgroundColor: theme.bg,
  },
  contentInner: {
    paddingHorizontal: theme.spaceLg,
    backgroundColor: theme.bg,
  },
  saveFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bgElevated,
    paddingTop: theme.spaceMd,
  },
  saveFooterInner: {
    paddingHorizontal: theme.spaceLg,
  },
  section: { marginTop: theme.spaceLg },
  garageSection: { marginBottom: theme.spaceSm },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
    padding: theme.spaceXl,
    gap: theme.spaceMd,
  },
  heroImgWrap: {
    marginHorizontal: -theme.spaceLg,
    marginTop: 0,
    marginBottom: theme.spaceLg,
    borderRadius: theme.radiusLg,
    overflow: "hidden",
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  heroCarousel: { width: "100%" },
  heroImgPage: {},
  heroImg: { width: "100%" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroBar: {
    position: "absolute",
    left: theme.spaceMd,
    right: theme.spaceMd,
    bottom: theme.spaceMd,
  },
  heroBarInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spaceSm,
    alignSelf: "flex-start",
    paddingHorizontal: theme.spaceSm,
    paddingVertical: theme.spaceSm,
    borderRadius: theme.radiusMd,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  title: {
    ...theme.typeTitleLg,
    color: theme.text,
  },
  meta: {
    marginTop: 6,
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  thStrip: {
    marginTop: theme.spaceLg,
    minHeight: 56,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadow.card,
  },
  thStripActive: {
    borderLeftWidth: 3,
    borderLeftColor: theme.accentSecondary,
  },
  thStripDisabled: { opacity: 0.75 },
  thStripLeft: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd },
  thStripLabel: { fontSize: 11, fontWeight: "800", color: theme.textMuted, letterSpacing: 0.6 },
  thStripValue: { fontSize: 16, fontWeight: "800", color: theme.text, marginTop: 2 },
  thStripCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceXs,
    minHeight: theme.touchTargetMin,
    paddingLeft: theme.spaceSm,
    justifyContent: "flex-end",
  },
  thStripCtaLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.accentSecondary,
  },
  thStripHint: { fontSize: 14, fontWeight: "600", color: theme.textMuted },
  body: { fontSize: 16, lineHeight: 24, color: theme.textSecondary, fontWeight: "500" },
  mono: {
    ...theme.typeMono,
    color: theme.text,
    marginBottom: theme.spaceSm,
  },
  varRow: { flexDirection: "row", gap: theme.spaceMd, marginBottom: theme.spaceMd },
  varBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.accent,
    marginTop: 7,
  },
  varMain: { fontWeight: "700", color: theme.text, fontSize: 15 },
  varNote: { color: theme.textSecondary, marginTop: 4, fontSize: 14, lineHeight: 20 },
  toggleCard: {
    marginTop: theme.spaceLg,
    padding: theme.spaceLg,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd },
  toggleTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  toggleSub: { fontSize: 13, color: theme.textMuted, marginTop: 2, fontWeight: "500" },
  sectionHint: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: theme.spaceMd,
    lineHeight: 18,
    fontWeight: "500",
  },
  subhead: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  attrRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceMd,
    marginBottom: theme.spaceMd,
    paddingBottom: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  attrSource: { fontSize: 13, fontWeight: "800", color: theme.textSecondary, marginBottom: 4 },
  attrField: { fontSize: 12, fontWeight: "800", color: theme.textMuted, textTransform: "uppercase" },
  attrVal: { fontSize: 14, color: theme.text, marginTop: 4, lineHeight: 20, fontWeight: "600" },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: theme.spaceSm,
  },
  sourceLinkTxt: { fontSize: 14, fontWeight: "800", color: theme.accent },
  lastVerified: {
    marginTop: theme.spaceSm,
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: "600",
  },
  rumorBanner: {
    flexDirection: "row",
    gap: theme.spaceSm,
    alignItems: "center",
    marginTop: theme.spaceMd,
    backgroundColor: theme.rumorBg,
    padding: theme.spaceMd,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.rumorText + "44",
  },
  rumorBannerTxt: { flex: 1, color: theme.rumorText, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  muted: { color: theme.textMuted, fontWeight: "600" },
  mutedSmall: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  error: { color: theme.danger, fontWeight: "700", textAlign: "center" },
  note: {
    marginBottom: theme.spaceLg,
    paddingBottom: theme.spaceLg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  noteBody: { color: theme.text, fontSize: 15, lineHeight: 22, fontWeight: "500" },
  noteMeta: { marginTop: theme.spaceSm, fontSize: 12, color: theme.textMuted, fontWeight: "600" },
  chipLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.textMuted,
    marginTop: theme.spaceMd,
    marginBottom: theme.spaceSm,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: theme.spaceSm },
  garageInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.bg,
    color: theme.text,
    marginBottom: theme.spaceSm,
  },
  garageNotesInput: { minHeight: 72, textAlignVertical: "top" },
});
