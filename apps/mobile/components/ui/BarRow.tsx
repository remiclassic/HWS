import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../lib/theme";

/** Labelled horizontal bar for simple breakdowns; `max` is the longest bar in the set. */
export const BarRow = memo(function BarRow({
  label,
  value,
  max,
  color = theme.accentSecondary,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { marginBottom: theme.spaceMd },
  head: { flexDirection: "row", justifyContent: "space-between", gap: theme.spaceMd, marginBottom: 6 },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.text },
  value: { fontSize: 15, fontWeight: "800", color: theme.text, fontVariant: ["tabular-nums"] },
  track: {
    height: 8,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.bgSubtle,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: theme.radiusFull },
});
