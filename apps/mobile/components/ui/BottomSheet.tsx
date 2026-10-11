import { memo, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned under the scrolling body — primary action(s) */
  footer?: ReactNode;
};

/** Modal sheet anchored to the bottom edge; backdrop tap or the close button dismisses. */
export const BottomSheet = memo(function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spaceLg) }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            {...themedScrollIndicatorProps}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay },
  sheet: {
    maxHeight: "88%",
    width: "100%",
    maxWidth: theme.contentMaxWidthPhoneFirst,
    alignSelf: "center",
    backgroundColor: theme.bgElevated,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: theme.borderStrong,
    ...theme.shadow.floating,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.borderStrong,
    marginTop: theme.spaceSm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
    paddingTop: theme.spaceMd,
    paddingBottom: theme.spaceMd,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...theme.typeTitleMd, fontSize: 20, color: theme.text },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: "500", color: theme.textSecondary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgRaised,
  },
  closeBtnPressed: { opacity: 0.7 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: theme.spaceLg, paddingBottom: theme.spaceLg },
  footer: {
    paddingHorizontal: theme.spaceLg,
    paddingTop: theme.spaceMd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    gap: theme.spaceSm,
  },
});
