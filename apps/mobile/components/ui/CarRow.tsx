import { memo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LineType, TreasureHuntType, UserCarStatus } from "@hotwheels/shared";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";
import { motion } from "../../lib/motion";
import { theme } from "../../lib/theme";
import { HuntBadge } from "./HuntBadge";
import { LineChip } from "./LineChip";
import { RemoteImage } from "./RemoteImage";

/** Corner tag on the thumbnail when a catalog row is already in the user's garage */
const GARAGE_TAG: Record<UserCarStatus, { label: string; bg: string; fg: string }> = {
  Owned: { label: "Owned", bg: theme.officialBg, fg: theme.officialText },
  Want: { label: "Want", bg: theme.rlcBg, fg: theme.rlcText },
  Duplicate: { label: "Dupe", bg: theme.communityBg, fg: theme.communityText },
};

/** Only the first screenful animates in — later pages should just appear while scrolling. */
const STAGGERED_ROWS = 8;

type Props = {
  title: string;
  /** Secondary line: year, series, condition… */
  meta: string;
  imageUri: string | null | undefined;
  line?: LineType;
  hunt?: TreasureHuntType;
  /** Catalog lists: marks castings the user already saved */
  garageStatus?: UserCarStatus;
  /** Right end of the chip line (confidence, status pill) */
  badge?: ReactNode;
  /** Right edge of the row, outside the main press target (e.g. overflow menu) */
  trailing?: ReactNode;
  index: number;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
};

/** Catalog / garage list row: thumbnail, name, meta, and at-a-glance chips. */
export const CarRow = memo(function CarRow({
  title,
  meta,
  imageUri,
  line,
  hunt,
  garageStatus,
  badge,
  trailing,
  index,
  onPress,
  onLongPress,
  accessibilityLabel,
}: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(true, motion.scalePressSubtle);

  return (
    <Animated.View
      entering={
        index < STAGGERED_ROWS
          ? FadeInDown.duration(260).delay(index * motion.staggerItemMs)
          : undefined
      }
      style={styles.card}
    >
      <ReanimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.main, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View>
          {imageUri ? (
            <RemoteImage uri={imageUri} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialCommunityIcons name="car-side" size={28} color={theme.textMuted} />
            </View>
          )}
          {garageStatus ? (
            <View style={[styles.garageTag, { backgroundColor: GARAGE_TAG[garageStatus].bg }]}>
              <MaterialCommunityIcons
                name={garageStatus === "Want" ? "heart" : "check"}
                size={11}
                color={GARAGE_TAG[garageStatus].fg}
              />
              <Text style={[styles.garageTagTxt, { color: GARAGE_TAG[garageStatus].fg }]}>
                {GARAGE_TAG[garageStatus].label}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
          <View style={styles.chipLine}>
            <View style={styles.chips}>
              {line ? <LineChip line={line} tooltip={false} /> : null}
              {hunt ? <HuntBadge type={hunt} tooltip={false} /> : null}
            </View>
            {badge}
          </View>
        </View>
      </ReanimatedPressable>
      {trailing}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: theme.spaceSm,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
  },
  thumb: {
    width: 92,
    height: 68,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.bgSubtle,
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  garageTag: {
    position: "absolute",
    left: 4,
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radiusFull,
  },
  garageTagTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: "800", color: theme.text, letterSpacing: -0.2 },
  meta: { marginTop: 2, fontSize: 13, fontWeight: "500", color: theme.textSecondary },
  chipLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spaceSm,
    marginTop: theme.spaceSm,
  },
  chips: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
