import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../lib/theme";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.row}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.btnGhostTxt}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.btnDanger : styles.btnPrimary,
                (busy || pressed) && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={destructive ? styles.btnDangerTxt : styles.btnPrimaryTxt}>
                {busy ? "Working…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spaceLg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: theme.spaceLg,
    gap: theme.spaceMd,
  },
  title: { fontSize: 18, fontWeight: "800", color: theme.text },
  message: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, fontWeight: "500" },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spaceSm, marginTop: theme.spaceSm },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: theme.spaceLg,
    borderRadius: theme.radiusMd,
    minWidth: 96,
    alignItems: "center",
  },
  btnGhost: { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  btnPrimary: { backgroundColor: theme.accent },
  btnDanger: { backgroundColor: theme.danger },
  pressed: { opacity: 0.85 },
  btnGhostTxt: { color: theme.text, fontWeight: "700", fontSize: 15 },
  btnPrimaryTxt: { color: theme.bg, fontWeight: "800", fontSize: 15 },
  btnDangerTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
