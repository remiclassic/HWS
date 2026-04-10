import { useCallback, useMemo } from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from "react-native-reanimated";
import { motion } from "../lib/motion";

export const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export function usePressScale(
  enabled: boolean,
  scaleTo: number = motion.scalePressStrong,
  spring: WithSpringConfig = motion.springPress,
) {
  const scale = useSharedValue(1);

  // Explicit `[]` keeps web (no Reanimated Babel pass) happy — see Reanimated web docs
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }), []);

  const onPressIn = useCallback(() => {
    if (enabled) scale.value = withSpring(scaleTo, spring);
  }, [enabled, scale, scaleTo, spring]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, spring);
  }, [scale, spring]);

  return useMemo(
    () => ({ animatedStyle, onPressIn, onPressOut }),
    [animatedStyle, onPressIn, onPressOut],
  );
}
