import { ScrollView, StyleSheet, Text } from "react-native";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

export default function TermsScreen() {
  return (
    <ScrollView {...themedScrollIndicatorProps} style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.p}>
        By using Hot Wheels Spotter you agree to use the app only for lawful purposes and to respect intellectual
        property belonging to Mattel and other rights holders. Catalog images and names may be trademarks; the app is
        an independent collector tool and is not affiliated with or endorsed by Mattel.
      </Text>
      <Text style={styles.p}>
        You are responsible for the accuracy of data you submit (garage notes, corrections, community notes). The
        service is provided as-is; availability and data are not guaranteed.
      </Text>
      <Text style={styles.p}>
        Leaderboard participation is optional. Public profile fields are limited to what you enable in Settings.
      </Text>
      <Text style={styles.p}>
        Replace this stub with your final terms of service before production release.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  p: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.textSecondary,
    fontWeight: "500",
    marginBottom: theme.spaceMd,
  },
});
