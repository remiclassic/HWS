import { useCallback } from "react";
import { Alert, Pressable, Share } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppTabBar } from "../../components/navigation/AppTabBar";
import { IconShareExport, IconSpotterTab, IconGarageTab } from "../../components/icons/AppIcons";
import { fetchGarage } from "../../lib/api";
import { theme } from "../../lib/theme";

function GarageExportHeaderButton() {
  const garageQuery = useQuery({ queryKey: ["garage"] as const, queryFn: fetchGarage });
  const onPress = useCallback(() => {
    const items = garageQuery.data?.items;
    if (!items?.length) {
      Alert.alert("Nothing to export", "Add cars to your garage first.");
      return;
    }
    const payload = JSON.stringify(
      { exportedAt: new Date().toISOString(), version: 1, items },
      null,
      2,
    );
    void Share.share({ message: payload, title: "Hot Wheels garage export" });
  }, [garageQuery.data?.items]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Export garage as JSON"
      style={{ marginRight: 4 }}
    >
      <IconShareExport color={theme.accent} size={24} />
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
          backgroundColor: theme.bgElevated,
        },
        headerShadowVisible: false,
        headerTintColor: theme.accent,
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 17,
          color: theme.text,
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
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "My Garage",
          tabBarLabel: "Garage",
          tabBarIcon: ({ color, size }) => <IconGarageTab color={color} size={size ?? 24} />,
          headerRight: () => <GarageExportHeaderButton />,
        }}
      />
    </Tabs>
  );
}
