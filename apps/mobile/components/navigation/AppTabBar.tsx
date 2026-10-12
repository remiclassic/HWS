import { memo, useCallback, useContext, type ComponentProps } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { IconBarcodeScan } from "../icons/AppIcons";
import { spotterAssets } from "../../lib/spotterAssets";
import { theme } from "../../lib/theme";

function triggerHaptic() {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const SCAN_SIZE = 68;
/** How far the scan button rises above the nav plate. */
const SCAN_LIFT = 26;
const TREAD_TOP = 10;

const NavItem = memo(function NavItem({
  label,
  icon,
  selected,
  color,
  onPress,
  role,
  a11yHint,
}: {
  label: string;
  icon: IconName;
  selected: boolean;
  color: string;
  onPress: () => void;
  role: "tab" | "button";
  a11yHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === "tab" ? { selected } : undefined}
      accessibilityLabel={label}
      accessibilityHint={a11yHint}
      onPress={onPress}
      style={styles.item}
    >
      <MaterialCommunityIcons name={icon} size={26} color={color} />
      <Text style={[styles.label, { color }, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {selected ? <View style={styles.selectedBar} /> : null}
    </Pressable>
  );
});

export const AppTabBar = memo(function AppTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // The scan button overhangs the plate; lists only need to clear the plate itself.
      onHeightChange?.(e.nativeEvent.layout.height - SCAN_LIFT);
    },
    [onHeightChange],
  );

  const refRoute = state.routes[0];
  const opts = refRoute ? descriptors[refRoute.key]?.options : undefined;
  const activeTint = (opts?.tabBarActiveTintColor as string) ?? theme.accent;
  const inactiveTint = (opts?.tabBarInactiveTintColor as string) ?? theme.navInactive;

  const focusedRoute = state.routes[state.index];
  const garageRoute = state.routes.find((r) => r.name === "garage");
  const garageFocused = focusedRoute?.name === "garage";
  const wishlistFocused =
    garageFocused && (focusedRoute?.params as { status?: string } | undefined)?.status === "Want";

  const goToTab = useCallback(
    (name: string, params?: Record<string, string>) => {
      triggerHaptic();
      const route = state.routes.find((r) => r.name === name);
      if (!route) return;
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(name, params);
      }
    },
    [navigation, state.routes],
  );

  const onBrowse = useCallback(() => goToTab("index"), [goToTab]);
  // Wishlist is the garage narrowed to "Want"; the garage screen reads `status`.
  const onWishlist = useCallback(() => goToTab("garage", { status: "Want" }), [goToTab]);
  const onGarage = useCallback(() => goToTab("garage", { status: "all" }), [goToTab]);

  const onCollection = useCallback(() => {
    triggerHaptic();
    router.push("/collector-progress");
  }, []);

  const onScanPress = useCallback(() => {
    triggerHaptic();
    router.push("/scan");
  }, []);

  const tint = (selected: boolean) => (selected ? activeTint : inactiveTint);
  const browseSelected = focusedRoute?.name === "index";
  const garageSelected = garageFocused && !wishlistFocused;

  return (
    <View onLayout={handleLayout} style={styles.outer}>
      <View style={styles.tread}>
        <Image source={spotterAssets.tireTread} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={[styles.plate, { marginBottom: Math.max(insets.bottom, 8) }]}>
          <NavItem
            label="Browse"
            icon="binoculars"
            role="tab"
            selected={browseSelected}
            color={tint(browseSelected)}
            onPress={onBrowse}
          />
          <NavItem
            label="Wishlist"
            icon={wishlistFocused ? "heart" : "heart-outline"}
            role="tab"
            selected={wishlistFocused}
            color={tint(wishlistFocused)}
            onPress={onWishlist}
          />
          <View style={styles.centerSlot}>
            <Text style={styles.scanLabel}>Scan</Text>
          </View>
          {garageRoute ? (
            <NavItem
              label="Garage"
              icon="garage-variant"
              role="tab"
              selected={garageSelected}
              color={tint(garageSelected)}
              onPress={onGarage}
            />
          ) : (
            <View style={styles.item} />
          )}
          <NavItem
            label="Collection"
            icon="trophy-outline"
            role="button"
            selected={false}
            color={inactiveTint}
            onPress={onCollection}
            a11yHint="Opens your collector progress"
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan barcode"
        accessibilityHint="Opens the camera to scan a product barcode"
        onPress={onScanPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <LinearGradient
          colors={[theme.accentHover, theme.accent, theme.accentPressed]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.fabFace}
        >
          <IconBarcodeScan color="#FFFFFF" size={34} />
        </LinearGradient>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
    paddingTop: SCAN_LIFT,
    zIndex: 20,
    elevation: 12,
    pointerEvents: "box-none",
  },
  tread: {
    paddingTop: TREAD_TOP,
    backgroundColor: theme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    overflow: "hidden",
  },
  plate: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: theme.navPlate,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    paddingTop: theme.spaceSm,
    paddingBottom: 10,
    minHeight: 60,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  labelSelected: {
    fontWeight: "800",
  },
  selectedBar: {
    position: "absolute",
    bottom: 0,
    width: 40,
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: theme.accent,
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
    pointerEvents: "none",
  },
  scanLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.1,
    color: theme.text,
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    top: 0,
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: SCAN_SIZE / 2,
    backgroundColor: theme.accent,
    ...Platform.select({
      web: { boxShadow: "0px 4px 14px rgba(232, 34, 44, 0.45)" },
      default: {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  fabFace: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: SCAN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});
