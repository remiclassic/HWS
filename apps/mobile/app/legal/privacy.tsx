import { ScrollView, StyleSheet, Text } from "react-native";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

export default function PrivacyScreen() {
  return (
    <ScrollView {...themedScrollIndicatorProps} style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.p}>
        Hot Wheels Spotter collects only what is needed to run the app: an account record (anonymous or email-based),
        your garage entries, optional leaderboard display fields you choose, and push tokens if you enable want-list
        alerts.
      </Text>
      <Text style={styles.p}>
        Catalog and car data may come from registered sources; community notes are stored as provided. Do not submit
        personal data about others in notes or reports.
      </Text>
      <Text style={styles.p}>
        You can export your garage data from Settings and delete your account from the same screen. Deleting your
        account removes your profile and associated garage data from our servers, subject to routine backups
        expiring.
      </Text>
      <Text style={styles.p}>
        For questions about this policy, contact the team maintaining your deployment of Spotter. Replace this stub
        with your final privacy policy before production release.
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
