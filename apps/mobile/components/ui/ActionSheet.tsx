import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../lib/theme";

export type ActionSheetOption = {
  key: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  /** Shows a check mark — for single-choice sheets like sort order. */
  selected?: boolean;
  onPress: () => void;
};

export type ActionSheetProps = {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
};

/** Bottom sheet menu. Works on web, where `Alert.alert` buttons and `ActionSheetIOS` do not. */
export function ActionSheet({ visible, title, options, onClose }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu">
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spaceMd) }]}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="menu"
        >
          <View style={styles.grabber} />
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {options.map((o) => (
            <Pressable
              key={o.key}
              onPress={() => {
                onClose();
                o.onPress();
              }}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              accessibilityRole="menuitem"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: o.selected }}
            >
              {o.icon ? <View style={styles.optionIcon}>{o.icon}</View> : null}
              <Text style={[styles.optionTxt, o.destructive && styles.optionTxtDestructive]}>{o.label}</Text>
              {o.selected ? (
                <MaterialCommunityIcons name="check" size={20} color={theme.accentSecondary} />
              ) : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: theme.contentMaxWidthPhoneFirst,
    backgroundColor: theme.bgElevated,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    paddingTop: theme.spaceSm,
    paddingHorizontal: theme.spaceSm,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.borderStrong,
    marginBottom: theme.spaceSm,
  },
  title: {
    ...theme.typeKicker,
    color: theme.textMuted,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: theme.spaceSm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spaceMd,
    minHeight: 52,
    paddingHorizontal: theme.spaceMd,
    borderRadius: theme.radiusMd,
  },
  optionPressed: { backgroundColor: theme.bgRaised },
  optionIcon: { width: 24, alignItems: "center" },
  optionTxt: { flex: 1, fontSize: 16, fontWeight: "700", color: theme.text },
  optionTxtDestructive: { color: theme.danger },
});
