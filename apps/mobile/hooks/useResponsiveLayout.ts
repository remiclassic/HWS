import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { theme } from "../lib/theme";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= theme.breakpointWide;

  return useMemo(
    () => ({
      isWide,
      contentMaxWidth: theme.contentMaxWidthPhoneFirst,
    }),
    [isWide],
  );
}
