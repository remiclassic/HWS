import { memo } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "../../lib/theme";

type Props = {
  online: boolean;
  pendingGarageOps: number;
  style?: ViewStyle;
};

export const OfflineBanner = memo(function OfflineBanner({ online, pendingGarageOps, style }: Props) {
  if (online && pendingGarageOps === 0) return null;

  const msg = !online
    ? pendingGarageOps > 0
      ? "Offline — garage changes will sync when you’re back online."
      : "Offline — reconnect to refresh catalog and garage."
    : `${pendingGarageOps} garage update${pendingGarageOps === 1 ? "" : "s"} queued for sync.`;

  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <Text style={styles.txt}>{msg}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: theme.spaceSm,
    paddingHorizontal: theme.spaceMd,
    backgroundColor: theme.communityBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  txt: {
    color: theme.communityText,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },
});
