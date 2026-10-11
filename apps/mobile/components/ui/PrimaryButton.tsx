import { memo, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../../lib/theme";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";

export const PrimaryButton = memo(function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** `ghost` = secondary outline; `danger` = destructive confirm */
  variant?: "primary" | "ghost" | "danger";
  icon?: ReactNode;
}) {
  const ghost = variant === "ghost";
  const danger = variant === "danger";
  const inactive = Boolean(disabled || loading);
  const [pressed, setPressed] = useState(false);
  const { animatedStyle, onPressIn: scaleIn, onPressOut: scaleOut } = usePressScale(!inactive);

  return (
    <ReanimatedPressable
      onPress={() => {
        if (!inactive) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={inactive}
      onPressIn={() => {
        if (!inactive) {
          setPressed(true);
          scaleIn();
        }
      }}
      onPressOut={() => {
        setPressed(false);
        scaleOut();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={[
        styles.btn,
        ghost ? styles.ghost : danger ? styles.danger : styles.primary,
        !ghost && !danger && pressed && styles.primaryPressed,
        (ghost || danger) && pressed && styles.outlinePressed,
        animatedStyle,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? theme.accentSecondary : danger ? theme.danger : "#fff"} />
      ) : (
        <>
          {icon}
          <Text style={[styles.txt, ghost && styles.ghostTxt, danger && styles.dangerTxt]}>{label}</Text>
        </>
      )}
    </ReanimatedPressable>
  );
});

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceLg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spaceSm,
  },
  primary: { backgroundColor: theme.accent },
  primaryPressed: { backgroundColor: theme.accentPressed },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  danger: {
    backgroundColor: theme.dangerSurface,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
  },
  outlinePressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  txt: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  ghostTxt: { color: theme.text },
  dangerTxt: { color: theme.danger },
});
