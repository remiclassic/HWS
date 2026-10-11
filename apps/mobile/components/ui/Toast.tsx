import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

type ToastKind = "success" | "info" | "error";

export type ToastOptions = {
  message: string;
  kind?: ToastKind;
  action?: { label: string; onPress: () => void };
};

type ToastState = ToastOptions & { id: number };

const ToastContext = createContext<{ show: (t: ToastOptions) => void } | null>(null);

const AUTO_HIDE_MS = 2800;
const AUTO_HIDE_WITH_ACTION_MS = 5000;
/** Clears the floating tab bar and sticky save footers */
const BOTTOM_OFFSET = 96;

const kindVisual: Record<ToastKind, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  success: { icon: "check-circle", color: theme.success },
  info: { icon: "information", color: theme.accentSecondary },
  error: { icon: "alert-circle", color: theme.danger },
};

/** Non-blocking confirmation — use instead of `Alert` when nothing needs deciding. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export const ToastProvider = memo(function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(1);

  const show = useCallback((t: ToastOptions) => {
    setToast({ ...t, id: nextId.current++ });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = toast.id;
    const timer = setTimeout(
      () => setToast((cur) => (cur?.id === id ? null : cur)),
      toast.action ? AUTO_HIDE_WITH_ACTION_MS : AUTO_HIDE_MS,
    );
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);
  const visual = toast ? kindVisual[toast.kind ?? "success"] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={[styles.host, { bottom: insets.bottom + BOTTOM_OFFSET }]} pointerEvents="box-none">
        {toast && visual ? (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(180)}
            style={styles.toast}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <MaterialCommunityIcons name={visual.icon} size={20} color={visual.color} />
            <Text style={styles.message} numberOfLines={3}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
              >
                <Text style={styles.action}>{toast.action.label}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
});

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: theme.spaceLg,
    zIndex: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    maxWidth: 480,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    ...theme.shadow.floating,
  },
  message: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: "600", color: theme.text },
  action: { fontSize: 15, fontWeight: "800", color: theme.accentSecondary },
});
