import { Easing } from "react-native-reanimated";

/** Shared motion tokens — short, confident springs; ease-out curves for fades */
export const motion = {
  springPress: { damping: 19, stiffness: 420, mass: 0.35 },
  springSnappy: { damping: 17, stiffness: 480, mass: 0.32 },
  springChip: { damping: 22, stiffness: 360, mass: 0.4 },
  timingBar: { duration: 520, easing: Easing.out(Easing.cubic) },
  timingFade: { duration: 320, easing: Easing.out(Easing.cubic) },
  staggerItemMs: 38,
  scalePressStrong: 0.97,
  scalePressSubtle: 0.985,
} as const;
