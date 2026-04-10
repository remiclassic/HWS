import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../lib/theme";

type Kind = "official" | "community" | "rumor";

export const SourcePill = memo(function SourcePill({ kind }: { kind: Kind }) {
  const cfg =
    kind === "official"
      ? { bg: theme.officialBg, fg: theme.officialText, t: "Official" }
      : kind === "rumor"
        ? { bg: theme.rumorBg, fg: theme.rumorText, t: "Rumor" }
        : { bg: theme.communityBg, fg: theme.communityText, t: "Community" };

  return (
    <View style={[styles.wrap, { backgroundColor: cfg.bg, borderColor: cfg.fg + "55" }]}>
      <Text style={[styles.txt, { color: cfg.fg }]}>{cfg.t}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radiusSm,
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
  },
  txt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
});
