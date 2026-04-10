import { memo, useCallback, useEffect, useRef, type ReactElement } from "react";
import { Platform, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { theme } from "../../lib/theme";
import { motion } from "../../lib/motion";
import { usePressScale, ReanimatedPressable } from "../../hooks/usePressScale";

type Base = {
  selected: boolean;
  onPress: () => void;
  a11yLabel: string;
};

/** Catalog filters: icon chip; optional press tooltip via `tooltipTitle` + `onPresentTooltip`. */
type IconChipProps = Base & {
  icon: ReactElement;
  label?: never;
  tooltipTitle?: string;
  tooltipDetail?: string;
  onPresentTooltip?: (anchor: LayoutRectangle, title: string, detail?: string) => void;
  /** From parent: `usePrefersFinePointer()` — hand cursor on desktop web only, not mobile web */
  webShowFinePointer?: boolean;
  selectedTint?: never;
};

/** Forms (status, condition): text only, no tooltip overlay */
type TextChipProps = Base & {
  label: string;
  icon?: never;
  tooltipTitle?: never;
  tooltipDetail?: never;
  onPresentTooltip?: never;
  webShowFinePointer?: never;
  /** When selected, use semantic colors instead of primary red */
  selectedTint?: { border: string; background: string; text: string };
};

export type FilterChipProps = IconChipProps | TextChipProps;

export const FilterChip = memo(function FilterChip(props: FilterChipProps) {
  const {
    selected,
    onPress,
    a11yLabel,
  } = props;

  const isIconMode = "icon" in props && props.icon != null;
  const icon = isIconMode ? props.icon : null;
  const label = !isIconMode ? props.label : null;
  const tooltipTitle = isIconMode ? props.tooltipTitle : undefined;
  const tooltipDetail = isIconMode ? props.tooltipDetail : undefined;
  const onPresentTooltip = isIconMode ? props.onPresentTooltip : undefined;
  const webShowFinePointer = isIconMode ? props.webShowFinePointer : false;
  const selectedTint = !isIconMode ? props.selectedTint : undefined;

  const wrapRef = useRef<View>(null);

  const { animatedStyle, onPressIn, onPressOut } = usePressScale(
    true,
    motion.scalePressSubtle,
    motion.springChip,
  );

  const selectPop = useSharedValue(1);

  useEffect(() => {
    if (selected) {
      selectPop.value = withSequence(
        withSpring(1.045, motion.springChip),
        withSpring(1, motion.springChip),
      );
    } else {
      selectPop.value = withSpring(1, motion.springChip);
    }
  }, [selected, selectPop]);

  const popStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: selectPop.value }],
    }),
    [],
  );

  const showTooltip = useCallback(() => {
    if (!onPresentTooltip || !tooltipTitle) return;
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      onPresentTooltip({ x, y, width, height }, tooltipTitle, tooltipDetail);
    });
  }, [onPresentTooltip, tooltipTitle, tooltipDetail]);

  const onChipPress = useCallback(() => {
    void Haptics.selectionAsync();
    onPress();
    showTooltip();
  }, [onPress, showTooltip]);

  return (
    <View ref={wrapRef} collapsable={false} style={styles.anchor}>
      <ReanimatedPressable
        onPress={onChipPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={a11yLabel}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.wrap,
          isIconMode ? styles.wrapIcon : styles.wrapText,
          selected && !selectedTint && styles.on,
          selected &&
            selectedTint && {
              borderColor: selectedTint.border,
              backgroundColor: selectedTint.background,
            },
          animatedStyle,
          Platform.OS === "web" && webShowFinePointer && styles.webPointer,
        ]}
      >
        <Animated.View style={[isIconMode ? styles.iconBox : styles.textBox, popStyle]}>
          {isIconMode ? (
            icon
          ) : (
            <Text
              style={[
                styles.txt,
                selected && (selectedTint ? { color: selectedTint.text } : styles.txtOn),
              ]}
            >
              {label}
            </Text>
          )}
        </Animated.View>
      </ReanimatedPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  anchor: {
    alignSelf: "flex-start",
  },
  wrap: {
    minHeight: theme.touchTargetMin,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radiusFull,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgElevated,
    marginRight: theme.spaceSm,
    marginBottom: theme.spaceSm,
  },
  wrapIcon: {
    minWidth: theme.touchTargetMin,
    paddingHorizontal: theme.spaceMd,
  },
  wrapText: {
    paddingHorizontal: 16,
  },
  on: {
    borderColor: theme.accent,
    backgroundColor: theme.accentMuted,
  },
  iconBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  textBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  txt: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
  txtOn: { color: theme.accent },
  webPointer: { cursor: "pointer" as const },
});
