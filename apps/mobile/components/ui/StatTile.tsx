import { memo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../lib/theme";

export const StatTile = memo(function StatTile({
  label,
  value,
  color = theme.text,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

/** Lays tiles out in an even row; wrap two of these for a 2×N grid. */
export const StatRow = memo(function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.spaceSm },
  tile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spaceMd,
    paddingHorizontal: theme.spaceSm,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
  },
  value: { fontSize: 24, fontWeight: "900", letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
  label: { marginTop: 2, fontSize: 12, fontWeight: "700", color: theme.textMuted },
});
