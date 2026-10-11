import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { theme } from "../../lib/theme";

export type ToastState = {
  /** Change the id to restart the auto-dismiss timer for a new message. */
  id: number;
  message: string;
  tone?: "default" | "danger";
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

export const TOAST_DEFAULT_DURATION_MS = 4000;

type Props = {
  toast: ToastState | null;
  onDismiss: () => void;
  /** Distance from the bottom of the screen — clear the floating tab bar. */
  bottomOffset?: number;
};

/** Transient bottom message with an optional action (e.g. Undo). Replaces button-less `Alert.alert`, which is a no-op on web. */
export function Toast({
  toast,
  onDismiss,
  bottomOffset = theme.spaceLg,
}: Props) {
  const id = toast?.id;
  const durationMs = toast?.durationMs ?? TOAST_DEFAULT_DURATION_MS;

  useEffect(() => {
    if (id == null) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [id, durationMs, onDismiss]);

  if (!toast) return null;

  return (
    <View style={[styles.anchor, { bottom: bottomOffset }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(160)}
        style={[styles.wrap, toast.tone === "danger" && styles.wrapDanger]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Text
          style={[styles.msg, toast.tone === "danger" && styles.msgDanger]}
          numberOfLines={3}
        >
          {toast.message}
        </Text>
        {toast.actionLabel && toast.onAction ? (
          <Pressable
            onPress={toast.onAction}
            hitSlop={10}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
          >
            <Text style={styles.actionTxt}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: theme.spaceLg,
    pointerEvents: "box-none",
  },
  wrap: {
    width: "100%",
    maxWidth: theme.contentMaxWidthPhoneFirst - theme.spaceLg * 2,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minHeight: 52,
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceLg,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    ...theme.shadow.card,
  },
  wrapDanger: { borderColor: theme.dangerBorder },
  msg: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  msgDanger: { color: theme.danger },
  action: {
    minHeight: theme.touchTargetMin - 8,
    justifyContent: "center",
    paddingHorizontal: theme.spaceSm,
  },
  actionPressed: { opacity: 0.7 },
  actionTxt: { color: theme.accentSecondary, fontSize: 15, fontWeight: "800" },
});
