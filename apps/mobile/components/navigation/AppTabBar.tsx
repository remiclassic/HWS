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

  const refRoute = state.routes[0];
  const opts = refRoute ? descriptors[refRoute.key]?.options : undefined;
  const activeTint = (opts?.tabBarActiveTintColor as string) ?? theme.accent;
  const inactiveTint = (opts?.tabBarInactiveTintColor as string) ?? theme.textMuted;

  const indexRoute = state.routes.find((r) => r.name === "index");
  const garageRoute = state.routes.find((r) => r.name === "garage");

  const renderSideTab = (
    route: (typeof state.routes)[number] | undefined,
    edge: "leading" | "trailing",
  ) => {
    const edgeStyle = edge === "leading" ? styles.sideTabLeading : styles.sideTabTrailing;
    const labelAlign = edge === "leading" ? ("left" as const) : ("right" as const);

    if (!route) return <View style={[styles.sideTab, edgeStyle]} />;

    const { options } = descriptors[route.key];
    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const isFocused = state.index === routeIndex;
    const visual = TAB_VISUALS[route.name] ?? { label: String(route.name), Icon: IconSpotterTab };
    const color = isFocused ? activeTint : inactiveTint;

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
        style={[styles.sideTab, edgeStyle]}
      >
        <Icon color={color} size={24} />
        <Text style={[styles.label, { color, textAlign: labelAlign }]} numberOfLines={1}>
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
      <View style={styles.barWrap} pointerEvents="box-none">
        <View style={styles.bar}>
          {renderSideTab(indexRoute, "leading")}
          <View style={styles.centerSlot} pointerEvents="box-none">
            <Text style={styles.scanLabel}>Scan</Text>
          </View>
          {renderSideTab(garageRoute, "trailing")}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
          accessibilityHint="Opens the camera to scan a product barcode"
          onPress={onScanPress}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <IconBarcodeScan color="#FFFFFF" size={26} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
    paddingTop: theme.spaceSm,
    zIndex: 20,
    elevation: 12,
  },
  barWrap: {
    marginHorizontal: theme.spaceSm,
    position: "relative",
    alignItems: "stretch",
  },
  bar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: theme.spaceMd,
    minHeight: 56,
    paddingHorizontal: theme.spaceMd,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusFull,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    ...theme.shadow.card,
  },
  sideTab: {
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: "flex-end",
    paddingTop: theme.spaceSm,
    paddingBottom: 10,
    gap: 4,
    minHeight: theme.touchTargetMin,
    minWidth: theme.touchTargetMin,
    paddingHorizontal: theme.spaceXs,
  },
  sideTabLeading: {
    alignItems: "flex-start",
  },
  sideTabTrailing: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  centerSlot: {
    width: 64,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
    minHeight: theme.touchTargetMin,
  },
  scanLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: theme.textSecondary,
    textTransform: "uppercase",
  },
  fab: {
    position: "absolute",
    left: "50%",
    top: -20,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.4)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  fabPressed: {
    backgroundColor: theme.accentPressed,
    transform: [{ scale: 0.96 }],
  },
});
