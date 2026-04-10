import { Platform } from "react-native";

export async function registerForExpoPushAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    const { registerForExpoPushAsync: reg } = await import("./registerForPush.web");
    return reg();
  }
  const { registerForExpoPushAsync: reg } = await import("./registerForPush.native");
  return reg();
}
