import { Platform, Share } from "react-native";

/**
 * Hand a JSON document to the user: a file download on web (react-native `Share` is a
 * no-op in desktop browsers), the native share sheet elsewhere.
 */
export async function exportJson(filenameStem: string, title: string, data: unknown): Promise<void> {
  const payload = JSON.stringify(data, null, 2);
  if (Platform.OS === "web") {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameStem}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }
  await Share.share({ message: payload, title });
}
