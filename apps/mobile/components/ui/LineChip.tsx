import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LineType } from "@hotwheels/shared";
import { theme } from "../../lib/theme";
import { AnimatedTooltip } from "./AnimatedTooltip";

const lineLabel: Record<LineType, string> = {
  Mainline: "Mainline",
  Premium: "Premium",
  RLC: "RLC",
  TeamTransport: "Team Transport",
  Entertainment: "Entertainment",
  Other: "Other",
};

const lineTip: Partial<Record<LineType, { title: string; detail: string }>> = {
  RLC: {
    title: "Red Line Club (RLC)",
    detail:
      "Mattel’s premium membership line: metal-heavy castings, collector-focused packaging, and limited releases outside standard mainline assortments.",
  },
  TeamTransport: {
    title: "Team Transport",
    detail: "Premium pairing sets: a hauler or transport rig packaged with a matching vehicle, sold as a single item.",
  },
};

export const LineChip = memo(function LineChip({ line }: { line: LineType }) {
  const isRlc = line === "RLC";
  const name = lineLabel[line];
  const tip = lineTip[line];
  const chip = (
    <View
      style={[styles.wrap, isRlc && styles.rlc]}
      accessibilityLabel={`Line: ${name}`}
    >
      <Text style={[styles.txt, isRlc && styles.rlcTxt]}>{name}</Text>
    </View>
  );
  if (!tip) return chip;
  return (
    <AnimatedTooltip title={tip.title} detail={tip.detail}>
      {chip}
    </AnimatedTooltip>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.bgSubtle,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rlc: {
    backgroundColor: theme.rlcBg,
    borderColor: theme.rlcBorder,
  },
  txt: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    letterSpacing: 0.2,
  },
  rlcTxt: { color: theme.rlcText },
});
