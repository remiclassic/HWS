import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../lib/theme";
import { AnimatedTooltip } from "./AnimatedTooltip";

export const HuntBadge = memo(function HuntBadge({ type }: { type: "None" | "TH" | "STH" }) {
  if (type === "None") return null;

  const isSth = type === "STH";
  const a11yLabel = isSth ? "Treasure Hunt: Super" : "Treasure Hunt: Regular";
  const tipTitle = isSth ? "Super Treasure Hunt (STH)" : "Treasure Hunt (TH)";
  const tipDetail = isSth
    ? "Ultra-rare mainline variant: premium Spectraflame-style paint, Real Rider wheels, and a gold “TH” circle flame logo on the card."
    : "Rare mainline chase: special deco and a “TH” logo hidden on the car or packaging. Distinct from a standard mainline release.";
  return (
    <AnimatedTooltip title={tipTitle} detail={tipDetail}>
      <View
        style={[styles.wrap, isSth ? styles.sth : styles.th]}
        accessibilityLabel={a11yLabel}
      >
        <View style={[styles.dot, isSth ? styles.dotSth : styles.dotTh]} />
        <Text style={[styles.txt, isSth ? styles.txtSth : styles.txtTh]}>{type}</Text>
      </View>
    </AnimatedTooltip>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radiusFull,
    borderWidth: 1,
  },
  th: { backgroundColor: theme.thBg, borderColor: theme.thBorder },
  sth: { backgroundColor: theme.sthBg, borderColor: theme.sthBorder },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotTh: { backgroundColor: theme.thText },
  dotSth: { backgroundColor: theme.sthText },
  txt: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  txtTh: { color: theme.thText },
  txtSth: { color: theme.sthText },
});
