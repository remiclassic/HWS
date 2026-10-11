import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppTabBar } from "../../components/navigation/AppTabBar";
import { IconShareExport, IconSpotterTab, IconGarageTab } from "../../components/icons/AppIcons";
import { useToast } from "../../components/ui/Toast";
import { fetchGarage } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import { exportJson } from "../../lib/exportJson";
import { theme } from "../../lib/theme";

const headerActionsRowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: theme.spaceXs,
  paddingRight: theme.spaceSm,
};

const headerButtonStyle = {
  width: theme.touchTargetMin,
  height: theme.touchTargetMin,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

function SettingsHeaderButton() {
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      style={headerButtonStyle}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
    >
      <MaterialCommunityIcons name="cog-outline" size={24} color={theme.textSecondary} />
    </Pressable>
  );
}

function GarageExportHeaderButton() {
  const toast = useToast();
  const garageQuery = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });
  const onPress = useCallback(() => {
    const items = garageQuery.data?.items;
    if (!items?.length) {
      toast.show({ kind: "info", message: "Nothing to export yet — add cars to your garage first." });
      return;
    }
    exportJson("hotwheels-garage", "Hot Wheels garage export", {
      exportedAt: new Date().toISOString(),
      version: 1,
      items,
    }).catch((e) => toast.show({ kind: "error", message: errorMessage(e) }));
  }, [garageQuery.data?.items, toast]);
  return (
    <Pressable
      onPress={onPress}
      style={headerButtonStyle}
      accessibilityRole="button"
      accessibilityLabel="Export garage as JSON"
    >
      <IconShareExport color={theme.textSecondary} size={24} />
    </Pressable>
  );
}

export default function TabLayout() {
  const renderTabBar = useCallback((props: BottomTabBarProps) => <AppTabBar {...props} />, []);

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.bg,
        },
        headerShadowVisible: false,
        headerTintColor: theme.text,
        headerTitleAlign: "left",
        headerTitleStyle: {
          fontWeight: "900",
          fontSize: 24,
          color: theme.text,
          letterSpacing: -0.4,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Spotter",
          tabBarLabel: "Browse",
          tabBarIcon: ({ color, size }) => <IconSpotterTab color={color} size={size ?? 24} />,
          headerRight: () => (
            <View style={headerActionsRowStyle}>
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "My Garage",
          tabBarLabel: "Garage",
          tabBarIcon: ({ color, size }) => <IconGarageTab color={color} size={size ?? 24} />,
          headerRight: () => (
            <View style={headerActionsRowStyle}>
              <GarageExportHeaderButton />
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
