import { Platform } from "react-native";

export function initSentry(): void {
  if (Platform.OS === "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./sentry.web").initSentry();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./sentry.native").initSentry();
  }
}
