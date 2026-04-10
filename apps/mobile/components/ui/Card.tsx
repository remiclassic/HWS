import { memo, type ReactNode } from "react";
import { StyleSheet, Text, type ViewProps } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { theme } from "../../lib/theme";
import { motion } from "../../lib/motion";

export const Card = memo(function Card({
  title,
  children,
  style,
  ...rest
}: ViewProps & { title?: string; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(motion.timingFade.duration).easing(motion.timingFade.easing)}
      style={[styles.card, theme.shadow.card, style]}
      {...rest}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: theme.spaceLg,
  },
  title: {
    ...theme.typeKicker,
    color: theme.textMuted,
    marginBottom: theme.spaceMd,
  },
});
