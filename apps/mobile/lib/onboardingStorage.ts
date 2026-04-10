import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "hotwheels_onboarding_complete";

export async function getOnboardingComplete(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "1";
}

export async function setOnboardingComplete(value: boolean): Promise<void> {
  if (value) await AsyncStorage.setItem(KEY, "1");
  else await AsyncStorage.removeItem(KEY);
}
