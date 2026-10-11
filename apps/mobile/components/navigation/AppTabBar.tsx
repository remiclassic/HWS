import { memo, useCallback, useContext, type ComponentType } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { IconBarcodeScan, IconGarageTab, IconSpotterTab } from "../icons/AppIcons";
import { theme } from "../../lib/theme";

function triggerHaptic() {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type TabVisual = { label: string; Icon: ComponentType<{ color: string; size?: number }> };

const TAB_VISUALS: Record<string, TabVisual> = {
  index: { label: "Browse", Icon: IconSpotterTab },
  garage: { label: "Garage", Icon: IconGarageTab },
};

const FAB_SIZE = 60;
/** Bar stays phone-sized on tablets / web instead of stretching edge to edge */
const BAR_MAX_WIDTH = 420;

export const AppTabBar = memo(function AppTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onHeightChange?.(e.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  const indexRoute = state.routes.find((r) => r.name === "index");
  const garageRoute = state.routes.find((r) => r.name === "garage");

  const renderTab = (route: (typeof state.routes)[number] | undefined) => {
    if (!route) return <View style={styles.tab} />;

    const { options } = descriptors[route.key];
    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const isFocused = state.index === routeIndex;
    const visual = TAB_VISUALS[route.name] ?? { label: String(route.name), Icon: IconSpotterTab };
    const color = isFocused ? theme.text : theme.textMuted;

    const onPress = () => {
      triggerHaptic();
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const Icon = visual.Icon;

    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? visual.label}
        onPress={onPress}
        style={styles.tab}
      >
        <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
          <Icon color={isFocused ? theme.accentSecondary : color} size={24} />
        </View>
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {visual.label}
        </Text>
      </Pressable>
    );
  };

  const onScanPress = useCallback(() => {
    triggerHaptic();
    router.push("/scan");
  }, []);

  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      onLayout={handleLayout}
      style={[styles.outer, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {renderTab(indexRoute)}
        <View style={styles.centerSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan barcode"
            accessibilityHint="Opens the camera to scan a product barcode"
            onPress={onScanPress}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <IconBarcodeScan color="#FFFFFF" size={28} />
          </Pressable>
          <Text style={styles.scanLabel}>Scan</Text>
        </View>
        {renderTab(garageRoute)}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    // Floats over the scene — screens pad their lists with `useBottomTabBarHeight()`
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    // Headroom for the scan button, which rides above the bar
    paddingTop: FAB_SIZE / 2,
    paddingHorizontal: theme.spaceLg,
    zIndex: 20,
  },
  bar: {
    width: "100%",
    maxWidth: BAR_MAX_WIDTH,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "stretch",
    height: 64,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusLg + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    ...theme.shadow.floating,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconPill: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: { backgroundColor: theme.accentSecondaryMuted },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  centerSlot: {
    width: FAB_SIZE + theme.spaceLg,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 9,
  },
  scanLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    color: theme.textSecondary,
  },
  fab: {
    position: "absolute",
    top: -FAB_SIZE / 2,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: theme.accent,
    borderWidth: 4,
    borderColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: {
    backgroundColor: theme.accentPressed,
    transform: [{ scale: 0.95 }],
  },
});
