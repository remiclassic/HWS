import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { AuthScaffold } from "../components/ui/AuthScaffold";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { sendPasswordReset } from "../lib/auth";
import { theme } from "../lib/theme";
import { useToast } from "../contexts/ToastContext";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { show: showToast, showError } = useToast();

  const onSubmit = useCallback(async () => {
    if (!email.trim()) {
      showError("Enter your email.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      // Generic response — don't leak whether the email exists.
      showToast({ message: "If an account exists for that address, we sent a reset link.", durationMs: 6000 });
      router.replace("/login");
    } catch (e) {
      showError("Could not send reset email", e);
    } finally {
      setBusy(false);
    }
  }, [email, showToast, showError]);

  return (
    <AuthScaffold title="Reset password" subtitle="Enter your email and we’ll send you a reset link.">
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        placeholder="you@example.com"
        editable={!busy}
        onSubmitEditing={() => void onSubmit()}
      />
      <PrimaryButton label="Send reset link" onPress={() => void onSubmit()} loading={busy} />
      <View style={styles.links}>
        <Link href="/login" asChild>
          <Pressable style={styles.link} accessibilityRole="link" accessibilityLabel="Back to sign in">
            <Text style={styles.linkTxt}>Back to sign in</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  links: { marginTop: theme.spaceXl, gap: theme.spaceLg, alignItems: "center" },
  link: { minHeight: 28, justifyContent: "center" },
  linkTxt: { fontSize: 15, fontWeight: "800", color: theme.accentSecondary },
  linkMuted: { color: theme.textSecondary, fontWeight: "600" },
});
