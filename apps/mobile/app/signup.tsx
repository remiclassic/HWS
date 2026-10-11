import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthScaffold } from "../components/ui/AuthScaffold";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { signUpWithPassword } from "../lib/auth";
import { theme } from "../lib/theme";
import { useToast } from "../contexts/ToastContext";

// Mirror the server-side rule: min 10 chars, at least one lower, one upper, one digit.
const PASSWORD_RULES: { label: string; error: string; test: (pw: string) => boolean }[] = [
  { label: "At least 10 characters", error: "Password must be at least 10 characters.", test: (pw) => pw.length >= 10 },
  { label: "A lowercase letter", error: "Password must include a lowercase letter.", test: (pw) => /[a-z]/.test(pw) },
  { label: "An uppercase letter", error: "Password must include an uppercase letter.", test: (pw) => /[A-Z]/.test(pw) },
  { label: "A number", error: "Password must include a number.", test: (pw) => /\d/.test(pw) },
];

function validatePassword(pw: string): string | null {
  return PASSWORD_RULES.find((rule) => !rule.test(pw))?.error ?? null;
}

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { showError } = useToast();

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      showError("Enter your email and password.");
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      showError(pwError);
      return;
    }
    setBusy(true);
    try {
      const { needsConfirmation } = await signUpWithPassword(email, password);
      if (needsConfirmation) {
        // Can't rely on Alert callbacks on web; push straight to login with a banner flag.
        router.replace({ pathname: "/login", params: { justSignedUp: "1", email: email.trim() } });
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      showError("Could not create account", e);
    } finally {
      setBusy(false);
    }
  }, [email, password, showError]);

  return (
    <AuthScaffold title="Create account" subtitle="Save your garage and take it to any device.">
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
      />
      <TextField
        label="Password"
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="password-new"
        textContentType="newPassword"
        placeholder="Choose a password"
        editable={!busy}
        onSubmitEditing={() => void onSubmit()}
      />
      <View style={styles.rules} accessibilityLabel="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <View key={rule.label} style={styles.rule}>
              <MaterialCommunityIcons
                name={ok ? "check-circle" : "circle-outline"}
                size={18}
                color={ok ? theme.officialText : theme.textMuted}
              />
              <Text style={[styles.ruleTxt, ok && styles.ruleTxtOk]}>{rule.label}</Text>
            </View>
          );
        })}
      </View>
      <PrimaryButton label="Create account" onPress={() => void onSubmit()} loading={busy} />
      <View style={styles.links}>
        <Link href="/login" asChild>
          <Pressable style={styles.link} accessibilityRole="link" accessibilityLabel="Sign in instead">
            <Text style={[styles.linkTxt, styles.linkMuted]}>
              Already have an account? <Text style={styles.linkTxt}>Sign in</Text>
            </Text>
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
  rules: { gap: theme.spaceSm, marginTop: -theme.spaceSm, marginBottom: theme.spaceXl },
  rule: { flexDirection: "row", alignItems: "center", gap: theme.spaceSm },
  ruleTxt: { fontSize: 14, fontWeight: "600", color: theme.textMuted },
  ruleTxtOk: { color: theme.textSecondary },
});
