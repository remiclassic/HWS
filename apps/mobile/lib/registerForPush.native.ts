import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveProjectId(): string | undefined {
  const raw = Constants.expoConfig?.extra?.eas?.projectId;
  if (raw == null || raw === "") return undefined;
  const s = String(raw);
  if (s.includes("replace")) return undefined;
  return s;
}

/** Returns Expo push token string, or null if unavailable / denied. */
export async function registerForExpoPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = resolveProjectId();
  const tokenRes = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenRes.data;
}
