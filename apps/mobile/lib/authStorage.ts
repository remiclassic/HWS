import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "hotwheels_auth_token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY, token);
}
