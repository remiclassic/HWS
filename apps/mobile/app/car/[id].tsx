import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LineType, SourceRef, TreasureHuntType } from "@hotwheels/shared";
import {
  DEFAULT_GARAGE_ENTRY,
  GarageEntryForm,
  type GarageEntryDraft,
} from "../../components/garage/GarageEntryForm";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Card } from "../../components/ui/Card";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { LineChip } from "../../components/ui/LineChip";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { SourcePill } from "../../components/ui/SourcePill";
import { TextField } from "../../components/ui/TextField";
import { useToast } from "../../components/ui/Toast";
import { useGarageQueueDepth } from "../../hooks/useGarageQueueDepth";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import {
  addToGarage,
  AlreadyInGarageError,
  fetchCar,
  fetchGarage,
  submitCarDataReport,
} from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import { enqueueGarageOp, isTransientNetworkError } from "../../lib/garageMutationQueue";
import { getIsOnline, useOnline } from "../../lib/network";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const LINE_LABEL: Record<LineType, string> = {
  Mainline: "Mainline",
  Premium: "Premium",
  RLC: "Red Line Club",
  TeamTransport: "Team Transport",
  Entertainment: "Entertainment",
  Other: "Other",
};

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
      <View style={styles.attrHead}>
        {pill}
        <Text style={styles.attrSource} numberOfLines={1}>
          {a.source_name}
        </Text>
      </View>
      <Text style={styles.attrField}>{a.field_path}</Text>
      <Text style={styles.attrVal}>{a.value ?? "—"}</Text>
      {showLink ? (
        <Pressable onPress={onOpen} style={styles.sourceLink} hitSlop={8} accessibilityRole="link">
          <Text style={styles.sourceLinkTxt}>Open source</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={theme.accentSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
});

const TreasureHuntStrip = memo(function TreasureHuntStrip({
  huntType,
  carId,
}: {
  huntType: Exclude<TreasureHuntType, "None">;
  carId: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(true);

  const onPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/th/${carId}`);
  }, [carId]);

  return (
    <ReanimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel="Open treasure hunt field guide"
      style={[styles.thStrip, animatedStyle]}
    >
      <View style={styles.thIcon}>
        <MaterialCommunityIcons name="fire" size={22} color={theme.trackYellow} />
      </View>
      <View style={styles.thText}>
        <Text style={styles.thTitle}>
          {huntType === "STH" ? "Super Treasure Hunt" : "Treasure Hunt"}
        </Text>
        <Text style={styles.thSub}>How to spot it on the pegs</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.thText} />
    </ReanimatedPressable>
  );
});

const FactRow = memo(function FactRow({
  label,
  value,
  mono,
  first,
}: {
  label: string;
  value: string;
  mono?: boolean;
  first?: boolean;
}) {
  return (
    <View style={[styles.factRow, !first && styles.factDivider]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, mono && styles.factValueMono]} selectable>
        {value}
      </Text>
    </View>
  );
});

function DetailSkeleton({ heroHeight }: { heroHeight: number }) {
  return (
    <View style={styles.root} accessibilityLabel="Loading reference" accessibilityRole="progressbar">
      <Skeleton height={heroHeight} radius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton width="40%" height={22} radius={theme.radiusFull} />
        <Skeleton width="80%" height={28} />
        <Skeleton width="50%" height={16} />
        <Skeleton height={8} radius={theme.radiusFull} />
        <Skeleton height={120} radius={theme.radiusMd} />
        <Skeleton height={160} radius={theme.radiusMd} />
      </View>
    </View>
  );
}

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
  const online = useOnline();
  const pendingGarage = useGarageQueueDepth();
  const toast = useToast();

  const [heroW, setHeroW] = useState(winW);
  const [heroPage, setHeroPage] = useState(0);
  const [showSources, setShowSources] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<GarageEntryDraft>(DEFAULT_GARAGE_ENTRY);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportFieldPath, setReportFieldPath] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["car", carId] as const,
    queryFn: () => fetchCar(carId),
    enabled: Boolean(carId),
  });

  // Same cache as the Garage tab — tells us whether this casting is already saved.
  const garageQuery = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });
  const garageEntry = useMemo(
    () => garageQuery.data?.items.find((i) => i.car_id === carId),
    [garageQuery.data?.items, carId],
  );

  const add = useMutation({
    mutationFn: async () => {
      const payload = {
        car_id: carId,
        status: draft.status,
        condition: draft.condition,
        quantity: draft.quantity,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
      };
      try {
        await addToGarage(payload);
        return { queued: false as const };
      } catch (e) {
        const likelyOffline = !(await getIsOnline());
        if (likelyOffline || isTransientNetworkError(e)) {
          await enqueueGarageOp({ v: 1, kind: "add", payload });
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: async (res) => {
      setAddOpen(false);
      setDraft(DEFAULT_GARAGE_ENTRY);
      await qc.invalidateQueries({ queryKey: ["garage"] });
      await qc.invalidateQueries({ queryKey: ["gamification"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(
        res.queued
          ? { kind: "info", message: "Offline — saved to sync when you’re back online." }
          : {
              message: "Saved to your garage",
              action: { label: "View", onPress: () => router.navigate("/(tabs)/garage") },
            },
      );
    },
    onError: (e) => {
      setAddOpen(false);
      if (e instanceof AlreadyInGarageError) {
        // Our cached garage was stale — refresh so the footer flips to "Edit garage entry".
        void qc.invalidateQueries({ queryKey: ["garage"] });
        toast.show({ kind: "info", message: "This car is already in your garage." });
        return;
      }
      toast.show({ kind: "error", message: errorMessage(e) });
    },
  });

  const report = useMutation({
    mutationFn: () =>
      submitCarDataReport(carId, {
        message: reportMessage.trim(),
        field_path: reportFieldPath.trim() ? reportFieldPath.trim() : null,
      }),
    onSuccess: () => {
      setReportOpen(false);
      setReportMessage("");
      setReportFieldPath("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({ message: "Report sent — thanks for improving the catalog." });
    },
    onError: (e) => setReportError(errorMessage(e)),
  });

  const submitReport = useCallback(() => {
    if (!reportMessage.trim()) {
      setReportError("Describe what looks incorrect.");
      return;
    }
    setReportError(null);
    report.mutate();
  }, [reportMessage, report]);

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

  const onHeroScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setHeroPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(heroW, 1)));
    },
    [heroW],
  );

  if (!carId) {
    return (
      <View style={styles.center}>
        <EmptyState icon="car-off" title="Reference not found" body="Go back and pick a casting from search.">
          <PrimaryButton label="Go back" variant="ghost" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  if (q.isError && !data) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="cloud-off-outline"
          tone="danger"
          title="Couldn’t load this car"
          body="Check your connection and try again."
        >
          <PrimaryButton label="Try again" onPress={() => void q.refetch()} loading={q.isFetching} />
        </EmptyState>
      </View>
    );
  }

  if (!data) return <DetailSkeleton heroHeight={heroHeight} />;

  const wideColumn =
    isWide && contentMaxWidth != null
      ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const }
      : undefined;

  const images = data.images ?? [];
  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: "Year", value: String(data.year) },
    ...(data.series ? [{ label: "Series", value: data.series }] : []),
    { label: "Line", value: LINE_LABEL[data.line_type] },
    ...(data.identifiers?.model_number
      ? [{ label: "Model", value: data.identifiers.model_number, mono: true }]
      : []),
    ...(data.identifiers?.case_code
      ? [{ label: "Case", value: data.identifiers.case_code, mono: true }]
      : []),
    ...(data.identifiers?.sku ? [{ label: "SKU", value: data.identifiers.sku, mono: true }] : []),
  ];
  const sourceCount = officialAttributions.length + communityAttributions.length;

  return (
    <View style={styles.root}>
      <OfflineBanner online={online} pendingGarageOps={pendingGarage} />
      <ScrollView
        {...themedScrollIndicatorProps}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={wideColumn}>
          <Animated.View
            entering={FadeIn.duration(320)}
            style={styles.hero}
            onLayout={(e) => setHeroW(e.nativeEvent.layout.width)}
          >
            {images.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onHeroScroll}
                style={{ height: heroHeight }}
              >
                {images.map((im, i) => (
                  <ExpoImage
                    key={im.id}
                    source={{ uri: im.official_image_url }}
                    style={{ height: heroHeight, width: heroW }}
                    contentFit="cover"
                    transition={220}
                    cachePolicy="memory-disk"
                    accessibilityLabel={`${data.casting_name}, photo ${i + 1} of ${images.length}`}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.heroPlaceholder, { height: heroHeight }]}>
                <MaterialCommunityIcons name="car-side" size={56} color={theme.textMuted} />
                <Text style={styles.heroPlaceholderTxt}>No reference photo yet</Text>
              </View>
            )}
            {images.length > 1 ? (
              <View style={styles.heroDots} pointerEvents="none">
                {images.map((im, i) => (
                  <View key={im.id} style={[styles.heroDot, i === heroPage && styles.heroDotOn]} />
                ))}
              </View>
            ) : null}
          </Animated.View>

          <View style={styles.contentInner}>
            <View style={styles.chipRow}>
              <LineChip line={data.line_type} />
              <HuntBadge type={data.treasure_hunt_type} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {data.casting_name}
            </Text>
            <Text style={styles.meta}>
              {data.year}
              {data.series ? ` · ${data.series}` : ""}
            </Text>

            <ConfidenceBar score={data.confidence_score} label="Reference confidence" />
            {data.last_verified_at ? (
              <Text style={styles.lastVerified}>
                Last verified{" "}
                {new Date(data.last_verified_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            ) : null}

            {data.treasure_hunt_type !== "None" ? (
              <TreasureHuntStrip huntType={data.treasure_hunt_type} carId={carId} />
            ) : null}

            {data.description ? <Text style={styles.body}>{data.description}</Text> : null}

            <Card title="Details" style={styles.section}>
              {facts.map((f, i) => (
                <FactRow key={f.label} label={f.label} value={f.value} mono={f.mono} first={i === 0} />
              ))}
            </Card>

            {data.known_variations.length > 0 ? (
              <Card title="Known variations" style={styles.section}>
                {data.known_variations.map((v) => (
                  <View key={v.id} style={styles.varRow}>
                    <View style={styles.varBullet} />
                    <View style={styles.flex}>
                      <Text style={styles.varMain}>
                        {[v.deco, v.wheels, v.region].filter(Boolean).join(" · ")}
                      </Text>
                      {v.notes ? <Text style={styles.varNote}>{v.notes}</Text> : null}
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card style={styles.section}>
              <Pressable
                onPress={() => setShowSources((v) => !v)}
                style={styles.sourcesHeader}
                accessibilityRole="button"
                accessibilityState={{ expanded: showSources }}
                accessibilityLabel={`Sources, ${sourceCount}`}
              >
                <View style={styles.flex}>
                  <Text style={styles.sourcesTitle}>Sources</Text>
                  <Text style={styles.sectionHint}>
                    {sourceCount === 0
                      ? "No attributions on file yet."
                      : `${officialAttributions.length} official · ${communityAttributions.length} community`}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showSources ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={theme.textSecondary}
                />
              </Pressable>
              {showSources && sourceCount > 0 ? (
                <View style={styles.sourcesBody}>
                  {officialAttributions.map((a) => (
                    <AttributionEntryRow
                      key={`${a.source_id}-${a.field_path}`}
                      a={a}
                      pill={<SourcePill kind="official" />}
                    />
                  ))}
                  {communityAttributions.map((a) => (
                    <AttributionEntryRow
                      key={`${a.source_id}-${a.field_path}-c`}
                      a={a}
                      pill={<SourcePill kind={a.is_rumor ? "rumor" : "community"} />}
                    />
                  ))}
                  {rumorAttributions.length > 0 ? (
                    <View style={styles.rumorBanner}>
                      <MaterialCommunityIcons name="alert-outline" size={18} color={theme.rumorText} />
                      <Text style={styles.rumorBannerTxt}>
                        Rumors are unverified — always confirm on card or sealed packaging.
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>

            {data.community_notes.length > 0 ? (
              <Card title="Community notes" style={styles.section}>
                {data.community_notes.map((n, i) => (
                  <View key={n.id} style={[styles.note, i > 0 && styles.noteDivider]}>
                    <Text style={styles.noteBody}>{n.body}</Text>
                    <Text style={styles.noteMeta}>
                      {n.source_name}
                      {n.is_official ? " · official" : " · community"}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            <Pressable
              onPress={() => {
                setReportError(null);
                setReportOpen(true);
              }}
              style={({ pressed }) => [styles.reportLink, pressed && styles.reportLinkPressed]}
              accessibilityRole="button"
              accessibilityLabel="Report a problem with this data"
            >
              <MaterialCommunityIcons name="flag-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.reportLinkTxt}>Something wrong? Report it</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.saveFooter, { paddingBottom: insets.bottom + theme.spaceMd }]}>
        <View style={[styles.saveFooterInner, wideColumn]}>
          {garageEntry ? (
            <>
              <View style={styles.inGarage}>
                <MaterialCommunityIcons name="check-circle" size={18} color={theme.success} />
                <Text style={styles.inGarageTxt} numberOfLines={1}>
                  In your garage · {garageEntry.status}
                  {garageEntry.status !== "Want" && garageEntry.quantity > 1
                    ? ` ×${garageEntry.quantity}`
                    : ""}
                </Text>
              </View>
              <PrimaryButton
                label="Edit garage entry"
                variant="ghost"
                onPress={() => router.push(`/garage-item/${garageEntry.id}`)}
                icon={<MaterialCommunityIcons name="pencil-outline" size={20} color={theme.text} />}
              />
            </>
          ) : (
            <PrimaryButton
              label="Add to garage"
              onPress={() => setAddOpen(true)}
              icon={<MaterialCommunityIcons name="plus" size={22} color="#fff" />}
            />
          )}
        </View>
      </View>

      <BottomSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add to garage"
        subtitle={data.casting_name}
        footer={
          <PrimaryButton
            label={draft.status === "Want" ? "Add to want list" : "Save to garage"}
            onPress={() => add.mutate()}
            loading={add.isPending}
          />
        }
      >
        <GarageEntryForm value={draft} onChange={setDraft} />
      </BottomSheet>

      <BottomSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report a problem"
        subtitle="Wrong year, hunt label, or photo? Tell us what should change."
        footer={<PrimaryButton label="Send report" onPress={submitReport} loading={report.isPending} />}
      >
        <TextField
          label="What’s wrong?"
          value={reportMessage}
          onChangeText={(v) => {
            setReportMessage(v);
            if (reportError) setReportError(null);
          }}
          error={reportError}
          placeholder="Describe the issue…"
          multiline
        />
        <TextField
          label="Which detail? (optional)"
          value={reportFieldPath}
          onChangeText={setReportFieldPath}
          placeholder="e.g. year, treasure hunt, photo"
          autoCapitalize="none"
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1, minWidth: 0 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: theme.spaceXl },
  contentInner: { paddingHorizontal: theme.spaceLg, paddingTop: theme.spaceLg },
  center: { flex: 1, justifyContent: "center", backgroundColor: theme.bg },
  skeletonBody: { padding: theme.spaceLg, gap: theme.spaceMd },
  hero: { backgroundColor: theme.bgSubtle },
  heroPlaceholder: { alignItems: "center", justifyContent: "center", gap: theme.spaceSm },
  heroPlaceholderTxt: { fontSize: 13, fontWeight: "600", color: theme.textMuted },
  heroDots: {
    position: "absolute",
    bottom: theme.spaceMd,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spaceSm,
    paddingVertical: 6,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  heroDotOn: { backgroundColor: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spaceSm, marginBottom: theme.spaceSm },
  title: { ...theme.typeTitleLg, color: theme.text },
  meta: { marginTop: 4, marginBottom: theme.spaceSm, color: theme.textSecondary, fontSize: 16, fontWeight: "600" },
  lastVerified: { marginTop: theme.spaceSm, fontSize: 13, color: theme.textMuted, fontWeight: "500" },
  thStrip: {
    marginTop: theme.spaceLg,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minHeight: 64,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.thBg,
    borderWidth: 1,
    borderColor: theme.thBorder,
  },
  thIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentYellowMuted,
  },
  thText: { flex: 1, minWidth: 0 },
  thTitle: { fontSize: 16, fontWeight: "800", color: theme.thText },
  thSub: { marginTop: 2, fontSize: 13, fontWeight: "600", color: theme.thText, opacity: 0.8 },
  body: {
    marginTop: theme.spaceLg,
    fontSize: 16,
    lineHeight: 24,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  section: { marginTop: theme.spaceLg },
  factRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spaceLg,
    paddingVertical: 10,
  },
  factDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  factLabel: { fontSize: 15, fontWeight: "500", color: theme.textMuted },
  factValue: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "700", color: theme.text },
  factValueMono: { fontFamily: theme.fontMono, fontWeight: "600" },
  varRow: { flexDirection: "row", gap: theme.spaceMd, marginBottom: theme.spaceMd },
  varBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.accentSecondary,
    marginTop: 7,
  },
  varMain: { fontWeight: "700", color: theme.text, fontSize: 15 },
  varNote: { color: theme.textSecondary, marginTop: 4, fontSize: 14, lineHeight: 20 },
  sourcesHeader: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd },
  sourcesTitle: { ...theme.typeKicker, color: theme.textMuted, marginBottom: 4 },
  sourcesBody: { marginTop: theme.spaceMd },
  sectionHint: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, fontWeight: "500" },
  attrRow: {
    paddingVertical: theme.spaceMd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  attrHead: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm },
  attrSource: { flex: 1, fontSize: 14, fontWeight: "700", color: theme.textSecondary },
  attrField: {
    marginTop: theme.spaceSm,
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    fontFamily: theme.fontMono,
  },
  attrVal: { fontSize: 15, color: theme.text, marginTop: 2, lineHeight: 21, fontWeight: "600" },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: theme.spaceSm,
  },
  sourceLinkTxt: { fontSize: 14, fontWeight: "700", color: theme.accentSecondary },
  rumorBanner: {
    flexDirection: "row",
    gap: theme.spaceSm,
    alignItems: "center",
    marginTop: theme.spaceSm,
    backgroundColor: theme.rumorBg,
    padding: theme.spaceMd,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.rumorText + "44",
  },
  rumorBannerTxt: { flex: 1, color: theme.rumorText, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  note: { paddingVertical: theme.spaceMd },
  noteDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  noteBody: { color: theme.text, fontSize: 15, lineHeight: 22, fontWeight: "500" },
  noteMeta: { marginTop: theme.spaceSm, fontSize: 12, color: theme.textMuted, fontWeight: "600" },
  reportLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spaceSm,
    minHeight: theme.touchTargetMin,
    marginTop: theme.spaceLg,
  },
  reportLinkPressed: { opacity: 0.7 },
  reportLinkTxt: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },
  saveFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bgElevated,
    paddingTop: theme.spaceMd,
  },
  saveFooterInner: { paddingHorizontal: theme.spaceLg, gap: theme.spaceSm },
  inGarage: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  inGarageTxt: { fontSize: 14, fontWeight: "700", color: theme.textSecondary },
});
