import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "hotwheels_pending_barcode";

export async function setPendingBarcode(code: string): Promise<void> {
  await AsyncStorage.setItem(KEY, code.trim());
}

export async function takePendingBarcode(): Promise<string | null> {
  const v = await AsyncStorage.getItem(KEY);
  if (v) await AsyncStorage.removeItem(KEY);
  return v;
}
