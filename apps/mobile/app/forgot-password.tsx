import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Link, router } from "expo-router";
import { Card } from "../components/ui/Card";
import { sendPasswordReset } from "../lib/auth";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert("Reset password", "Enter your email.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      // Generic response — don't leak whether the email exists.
      Alert.alert(
        "Check your email",
        "If an account exists for that address, we sent a reset link.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
    } catch (e) {
      Alert.alert("Could not send reset email", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [email]);

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="Reset password">
        <Text style={styles.hint}>Enter your email and we&apos;ll send you a reset link.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          editable={!busy}
          onSubmitEditing={() => void onSubmit()}
        />
        <Pressable
          onPress={() => void onSubmit()}
          disabled={busy}
          style={({ pressed }) => [styles.primaryBtn, (busy || pressed) && styles.primaryBtnDim]}
          accessibilityRole="button"
          accessibilityLabel="Send reset email"
        >
          {busy ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.primaryBtnTxt}>Send reset email</Text>
          )}
        </Pressable>
        <Link href="/login" asChild>
          <Pressable style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Back to sign in">
            <Text style={styles.linkTxt}>Back to sign in</Text>
          </Pressable>
        </Link>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: theme.spaceLg, paddingBottom: theme.space3xl },
  hint: { fontSize: 14, color: theme.textMuted, marginBottom: theme.spaceMd, fontWeight: "500", lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "800", color: theme.textMuted, marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: theme.spaceMd,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    backgroundColor: theme.bgSubtle,
    marginBottom: theme.spaceMd,
  },
  primaryBtn: {
    marginTop: theme.spaceSm,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.accent,
    alignItems: "center",
  },
  primaryBtnDim: { opacity: 0.7 },
  primaryBtnTxt: { fontSize: 16, fontWeight: "800", color: theme.bg },
  secondaryLink: { marginTop: theme.spaceLg, alignItems: "center" },
  linkTxt: { fontSize: 16, fontWeight: "800", color: theme.accent },
});
