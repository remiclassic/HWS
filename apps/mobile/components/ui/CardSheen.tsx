import { memo, useCallback, useMemo, useState } from "react";
import { StyleSheet, type LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { theme } from "../../lib/theme";

const SWEEP_MS = 620;
/** Let the foil catch the light before the screen changes. */
const NAV_DELAY_MS = 170;

export type CardSheenVariant = "foil" | "gold" | "holo";

/** Band stops, left → right. Holo is the rainbow refractor reserved for Super Treasure Hunts. */
const BAND_COLORS: Record<CardSheenVariant, readonly [string, string, ...string[]]> = {
  foil: [
    "rgba(255,255,255,0)",
    "rgba(120,190,255,0.22)",
    "rgba(255,255,255,0.6)",
    "rgba(120,190,255,0.22)",
    "rgba(255,255,255,0)",
  ],
  gold: [
    "rgba(255,255,255,0)",
    "rgba(255,196,48,0.3)",
    "rgba(255,246,214,0.72)",
    "rgba(255,150,40,0.3)",
    "rgba(255,255,255,0)",
  ],
  holo: [
    "rgba(255,255,255,0)",
    "rgba(255,84,214,0.34)",
    "rgba(120,220,255,0.4)",
    "rgba(255,255,255,0.72)",
    "rgba(160,255,170,0.36)",
    "rgba(255,214,90,0.34)",
    "rgba(255,255,255,0)",
  ],
};

const GLOW_COLORS: Record<CardSheenVariant, string> = {
  foil: theme.accentSecondary,
  gold: theme.thBorder,
  holo: theme.sthBorder,
};

/** Drives a one-shot foil sweep; call `play()` from `onPressIn`. */
export function useCardSheen() {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const play = useCallback(() => {
    if (reducedMotion) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: SWEEP_MS, easing: Easing.out(Easing.quad) });
  }, [progress, reducedMotion]);

  return useMemo(
    () => ({ progress, play, navDelayMs: reducedMotion ? 0 : NAV_DELAY_MS }),
    [progress, play, reducedMotion],
  );
}

type Props = {
  progress: SharedValue<number>;
  variant?: CardSheenVariant;
  /** Match the card's corner radius so the sheen is clipped to it. */
  radius?: number;
};

/**
 * Trading-card foil: a slanted band of light sweeps across the card over a brief tinted glow.
 * Absolutely fills its parent and never takes touches.
 */
export const CardSheen = memo(function CardSheen({
  progress,
  variant = "foil",
  radius = theme.radiusMd,
}: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const bandStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 0.12, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [-width * 0.75, width * 1.2]) },
        { skewX: "-20deg" },
      ],
    }),
    [width],
  );

  const glowStyle = useAnimatedStyle(
    () => ({ opacity: interpolate(progress.value, [0, 0.25, 1], [0, 0.16, 0]) }),
    [],
  );

  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.clip, { borderRadius: radius }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.glow, { backgroundColor: GLOW_COLORS[variant] }, glowStyle]} />
      <Animated.View style={[styles.band, bandStyle]}>
        <LinearGradient
          colors={BAND_COLORS[variant]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    pointerEvents: "none",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  band: {
    position: "absolute",
    top: "-20%",
    bottom: "-20%",
    left: 0,
    width: "55%",
  },
});
