import { memo, useCallback, useEffect, useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutRectangle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { theme } from "../../lib/theme";
import { motion } from "../../lib/motion";

export const TOOLTIP_BUBBLE_W = 248;
const AUTO_HIDE_MS = 2800;

type Props = {
  visible: boolean;
  anchor: LayoutRectangle;
  title: string;
  detail?: string;
  onDismiss: () => void;
};

/** Shared overlay + bubble; positioning uses window + anchor from measureInWindow */
export const TooltipModal = memo(function TooltipModal({ visible, anchor, title, detail, onDismiss }: Props) {
  const { width: winW } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withSpring(1, motion.springChip);
    }
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onDismiss(), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  const bubbleAnim = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [{ scale: 0.88 + 0.12 * progress.value }, { translateY: (1 - progress.value) * 6 }],
    }),
    [],
  );

  const { left, top } = useMemo(() => {
    const margin = theme.spaceLg;
    const centerX = anchor.x + anchor.width / 2;
    let l = centerX - TOOLTIP_BUBBLE_W / 2;
    l = Math.max(margin, Math.min(l, winW - TOOLTIP_BUBBLE_W - margin));
    const estimateH = detail ? 100 : 78;
    const t = Math.max(margin, anchor.y - estimateH - 4);
    return { left: l, top: t };
  }, [anchor.x, anchor.y, anchor.width, detail, winW]);

  const requestClose = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tip"
        />
        <Pressable
          onPress={() => {}}
          style={[styles.bubbleHit, { top, left, width: TOOLTIP_BUBBLE_W }]}
        >
          <Animated.View style={[styles.bubble, bubbleAnim]}>
            <Text style={styles.bubbleTitle}>{title}</Text>
            {detail ? <Text style={styles.bubbleDetail}>{detail}</Text> : null}
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  bubbleHit: {
    position: "absolute",
  },
  bubble: {
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceLg,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    ...theme.shadow.card,
  },
  bubbleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.text,
    letterSpacing: -0.2,
  },
  bubbleDetail: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: theme.textSecondary,
  },
});
