import { useCallback } from "react";
import { Alert, Platform, Pressable, Share, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppTabBar } from "../../components/navigation/AppTabBar";
import { IconShareExport, IconSpotterTab, IconGarageTab } from "../../components/icons/AppIcons";
import { fetchGarage } from "../../lib/api";
import { theme } from "../../lib/theme";

const headerActionsRowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 14,
  paddingRight: 18,
};

function SettingsHeaderButton() {
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
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
    if (Platform.OS === "web") {
      // react-native Share is a no-op on desktop browsers; write a real download.
      try {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hotwheels-garage-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (e) {
        Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
      }
      return;
    }
    void Share.share({ message: payload, title: "Hot Wheels garage export" });
  }, [garageQuery.data?.items]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Export garage as JSON"
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
