import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { theme } from "../../lib/theme";
import { motion } from "../../lib/motion";

type Option<K extends string> = { key: K; label: string; count?: number };

type Props<K extends string> = {
  options: readonly Option<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Read by screen readers as the group name, e.g. "Status" */
  accessibilityLabel: string;
};

const PAD = 3;

/** One-of-few picker: equal-width segments with a thumb that slides to the selection. */
export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<K>) {
  const [trackW, setTrackW] = useState(0);
  const segW = trackW > 0 ? (trackW - PAD * 2) / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * segW, motion.springChip);
  }, [index, segW, x]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }), []);

  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {segW > 0 ? <Animated.View style={[styles.thumb, { width: segW }, thumbStyle]} /> : null}
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(o.key);
            }}
            style={styles.segment}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.count == null ? o.label : `${o.label}, ${o.count}`}
          >
            <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={1}>
              {o.label}
            </Text>
            {o.count == null ? null : (
              <Text style={[styles.count, selected && styles.countOn]}>{o.count}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: PAD,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  thumb: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: theme.radiusMd - PAD,
    backgroundColor: theme.bgRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: theme.spaceXs,
  },
  label: { fontSize: 14, fontWeight: "700", color: theme.textMuted },
  labelOn: { color: theme.text },
  count: { fontSize: 12, fontWeight: "700", color: theme.textMuted },
  countOn: { color: theme.accentSecondary },
});
