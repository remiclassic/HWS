import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Shared frame for sign-in, sign-up and password reset: brand mark, heading, centered form column. */
export function AuthScaffold({ title, subtitle, children }: Props) {
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        {...themedScrollIndicatorProps}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <View style={styles.brand}>
            <Text style={styles.brandMark}>Hot Wheels</Text>
            <Text style={styles.brandTitle}>Spotter</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.form}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: {
    flexGrow: 1,
    alignItems: "center",
    padding: theme.spaceLg,
    paddingTop: theme.space2xl,
    paddingBottom: theme.space3xl,
  },
  column: { width: "100%", maxWidth: 420 },
  brand: { alignItems: "center", marginBottom: theme.space2xl },
  brandMark: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  brandTitle: { fontSize: 34, fontWeight: "900", color: theme.text, letterSpacing: -0.5, marginTop: 2 },
  title: { ...theme.typeTitleMd, color: theme.text },
  subtitle: { marginTop: 6, fontSize: 15, lineHeight: 22, fontWeight: "500", color: theme.textSecondary },
  form: { marginTop: theme.spaceXl },
});
