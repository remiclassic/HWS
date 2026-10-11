import { memo, useEffect } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { theme } from "../../lib/theme";
import { motion } from "../../lib/motion";
import { AnimatedTooltip } from "./AnimatedTooltip";

export const ConfidenceBar = memo(function ConfidenceBar({
  score,
  label = "Match confidence",
}: {
  score: number;
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  const trackW = useSharedValue(0);
  const target = useSharedValue(Math.min(1, Math.max(0, score)));

  useEffect(() => {
    target.value = withTiming(Math.min(1, Math.max(0, score)), motion.timingBar);
  }, [score]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackW.value = e.nativeEvent.layout.width;
  };

  const fillStyle = useAnimatedStyle(
    () => ({
      width: Math.max(0, trackW.value * target.value),
    }),
    [],
  );

  return (
    <AnimatedTooltip
      anchorStyle={styles.tooltipAnchor}
      title="Reference confidence"
      detail="How strongly this catalog row matches your search, SKU, and filters. Higher scores mean a tighter match to official-style data — not market value."
    >
      <View
        style={styles.wrap}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.pct}>{pct}%</Text>
        </View>
        <View style={styles.track} onLayout={onTrackLayout}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </View>
    </AnimatedTooltip>
  );
});

function confidenceColor(score: number): string {
  if (score >= 0.8) return theme.success;
  if (score >= 0.5) return theme.trackYellow;
  return theme.trackOrange;
}

/** Compact confidence for list rows — the full bar belongs on detail screens. */
export const ConfidencePill = memo(function ConfidencePill({ score }: { score: number }) {
  const clamped = Math.min(1, Math.max(0, score));
  const pct = Math.round(clamped * 100);
  return (
    <View style={styles.pill} accessible accessibilityLabel={`Reference confidence ${pct}%`}>
      <View style={[styles.pillDot, { backgroundColor: confidenceColor(clamped) }]} />
      <Text style={styles.pillTxt}>{pct}%</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 5 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillTxt: { fontSize: 12, fontWeight: "700", color: theme.textSecondary, fontVariant: ["tabular-nums"] },
  tooltipAnchor: { alignSelf: "stretch", width: "100%" },
  wrap: { marginTop: theme.spaceSm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spaceXs,
  },
  label: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
  pct: { fontSize: 13, fontWeight: "800", color: theme.text },
  track: {
    height: 8,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.bgSubtle,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radiusFull,
    backgroundColor: theme.accentSecondary,
  },
});
