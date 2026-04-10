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
  variant?: "primary" | "ghost";
  icon?: ReactNode;
}) {
  const ghost = variant === "ghost";
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
      style={[
        styles.btn,
        ghost ? styles.ghost : styles.primary,
        !ghost && pressed && styles.primaryPressed,
        animatedStyle,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? theme.accent : "#fff"} />
      ) : (
        <>
          {icon}
          <Text style={[styles.txt, ghost && styles.ghostTxt]}>{label}</Text>
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
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  disabled: { opacity: 0.55 },
  txt: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  ghostTxt: { color: theme.accent },
});
