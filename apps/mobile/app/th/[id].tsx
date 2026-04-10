import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { HuntBadge } from "../../components/ui/HuntBadge";
import { fetchThExplanation } from "../../lib/api";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

export default function ThExplanationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = typeof id === "string" ? id : "";

  const q = useQuery({
    queryKey: ["th", carId] as const,
    queryFn: () => fetchThExplanation(carId),
    enabled: Boolean(carId),
  });

  if (!carId) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="fire-off" size={36} color={theme.textMuted} />
        <Text style={styles.error}>Missing car id.</Text>
        <Text style={styles.errorSub}>Open this screen from a casting that has hunt data.</Text>
      </View>
    );
  }

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="fire-circle" size={40} color={theme.accentSecondary} />
        <Text style={styles.muted}>Pulling TH intel…</Text>
      </View>
    );
  }

  if (q.isError || !q.data) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-outline" size={36} color={theme.danger} />
        <Text style={styles.error}>Could not load explanation.</Text>
        <Text style={styles.errorSub}>Check your connection and try again.</Text>
      </View>
    );
  }

  const exp = q.data.th_explanation;
  const thType = q.data.treasure_hunt_type as "None" | "TH" | "STH";
  const markerCount = exp?.markers.length ?? 0;

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Field reference</Text>
        <View style={styles.heroRow}>
          <HuntBadge type={thType} />
          <Text style={styles.heroTitle}>Treasure Hunt</Text>
        </View>
        <Text style={styles.heroSub}>
          Quick decode for what makes this casting special in-release — not hype, just packaging and wheel cues.
        </Text>
      </View>

      <ConfidenceBar score={q.data.confidence_score} label="Model confidence" />

      {exp ? (
        <>
          <Card title="Summary" style={styles.section}>
            <Text style={styles.summary}>{exp.summary}</Text>
          </Card>
          <Card title="Markers to verify" style={styles.section}>
            {exp.markers.map((m, i) => (
              <View
                key={i}
                style={[styles.markerRow, i === markerCount - 1 && styles.markerRowLast]}
              >
                <MaterialCommunityIcons
                  name="checkbox-marked-circle-outline"
                  size={20}
                  color={theme.accentSecondary}
                />
                <Text style={styles.marker}>{m}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card style={styles.section}>
          <Text style={styles.muted}>
            This casting is not flagged as a TH or STH in the current reference snapshot.
          </Text>
        </Card>
      )}

      <View style={styles.footnote}>
        <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.textMuted} />
        <Text style={styles.footnoteTxt}>
          Always verify against sealed packaging and official references. Community signal can miss regional
          variants.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spaceLg,
    paddingBottom: theme.space2xl,
    backgroundColor: theme.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
    padding: theme.spaceXl,
    gap: theme.spaceMd,
  },
  hero: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radiusLg,
    padding: theme.spaceLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    marginBottom: theme.spaceLg,
    ...theme.shadow.card,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: theme.spaceMd, marginTop: theme.spaceSm },
  kicker: {
    ...theme.typeKicker,
    color: theme.textMuted,
  },
  heroTitle: {
    ...theme.typeTitleMd,
    color: theme.text,
  },
  heroSub: {
    marginTop: theme.spaceMd,
    fontSize: 15,
    lineHeight: 22,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  section: { marginTop: theme.spaceLg },
  summary: { fontSize: 16, lineHeight: 24, color: theme.text, fontWeight: "500" },
  markerRow: {
    flexDirection: "row",
    gap: theme.spaceMd,
    alignItems: "flex-start",
    marginBottom: theme.spaceMd,
  },
  markerRowLast: { marginBottom: 0 },
  marker: { flex: 1, fontSize: 15, lineHeight: 22, color: theme.textSecondary, fontWeight: "500" },
  footnote: {
    flexDirection: "row",
    gap: theme.spaceMd,
    alignItems: "flex-start",
    marginTop: theme.spaceXl,
    padding: theme.spaceMd,
    backgroundColor: theme.bgSubtle,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  footnoteTxt: { flex: 1, fontSize: 13, lineHeight: 19, color: theme.textSecondary, fontWeight: "500" },
  muted: { color: theme.textMuted, fontWeight: "600", lineHeight: 20 },
  error: { color: theme.danger, fontWeight: "800", textAlign: "center" },
  errorSub: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: theme.spaceLg,
  },
});
