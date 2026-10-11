import { memo, useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../lib/theme";

/** Pulsing placeholder block — size it to the content it stands in for. */
export const Skeleton = memo(function Skeleton({
  width = "100%",
  height = 14,
  radius = theme.radiusSm,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 640 }), withTiming(0.4, { duration: 640 })),
      -1,
      false,
    );
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }), []);
  return <Animated.View style={[styles.block, { width, height, borderRadius: radius }, anim, style]} />;
});

/** Mirrors `CarRow` so the list doesn't jump when results land. */
export const CarRowSkeleton = memo(function CarRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={92} height={68} />
      <View style={styles.rowText}>
        <Skeleton width="78%" height={16} />
        <Skeleton width="52%" height={12} />
        <Skeleton width="36%" height={20} radius={theme.radiusFull} />
      </View>
    </View>
  );
});

export const CarListSkeleton = memo(function CarListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <CarRowSkeleton key={i} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  block: { backgroundColor: theme.bgRaised },
  row: {
    flexDirection: "row",
    gap: theme.spaceMd,
    padding: theme.spaceMd,
    marginBottom: theme.spaceSm,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  rowText: { flex: 1, gap: theme.spaceSm, justifyContent: "center" },
});
