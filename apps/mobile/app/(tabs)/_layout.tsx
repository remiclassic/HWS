import { useCallback } from "react";
import { Alert, Pressable, Share, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppTabBar } from "../../components/navigation/AppTabBar";
import { IconShareExport, IconSpotterTab, IconGarageTab } from "../../components/icons/AppIcons";
import { fetchGarage } from "../../lib/api";
import { theme } from "../../lib/theme";

function SettingsHeaderButton() {
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      style={{ marginRight: 4 }}
    >
      <MaterialCommunityIcons name="cog-outline" size={24} color={theme.accent} />
    </Pressable>
  );
}

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
          letterSpacing: -0.2,
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
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "My Garage",
          tabBarLabel: "Garage",
          tabBarIcon: ({ color, size }) => <IconGarageTab color={color} size={size ?? 24} />,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <GarageExportHeaderButton />
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
