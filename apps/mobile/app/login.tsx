import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthScaffold } from "../components/ui/AuthScaffold";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { signInWithPassword, signInAnonymouslyDev } from "../lib/auth";
import { isLocalEnv } from "../lib/supabase";
import { theme } from "../lib/theme";
import { useToast } from "../contexts/ToastContext";

// Dev convenience: prefill with the seeded test user when running locally.
// See supabase/seed.sql. Release builds never see these defaults.
const DEV_EMAIL = "dev@hotwheels.local";
const DEV_PASSWORD = "dev-password-AA1";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ justSignedUp?: string; email?: string }>();
  const justSignedUp = params.justSignedUp === "1";
  const incomingEmail = typeof params.email === "string" ? params.email : "";
  const [email, setEmail] = useState(incomingEmail || (isLocalEnv ? DEV_EMAIL : ""));
  const [password, setPassword] = useState(incomingEmail ? "" : isLocalEnv ? DEV_PASSWORD : "");
  const [busy, setBusy] = useState(false);
  const { showError } = useToast();

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      showError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signInWithPassword(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      showError("Sign in failed", e);
    } finally {
      setBusy(false);
    }
  }, [email, password, showError]);

  const onDevAnon = useCallback(async () => {
    setBusy(true);
    try {
      await signInAnonymouslyDev();
      router.replace("/(tabs)");
    } catch (e) {
      showError("Anonymous sign-in failed", e);
    } finally {
      setBusy(false);
    }
  }, [showError]);

  return (
    <AuthScaffold title="Sign in" subtitle="Welcome back. Your garage is waiting.">
      {justSignedUp ? (
        <View style={styles.banner} accessibilityRole="alert">
          <MaterialCommunityIcons name="check-circle" size={22} color={theme.officialText} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Account created</Text>
            <Text style={styles.bannerBody}>
              {isLocalEnv
                ? "Sign in now with the password you just set."
                : "Check your inbox for a confirmation link, then sign in."}
            </Text>
          </View>
        </View>
      ) : null}
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
        autoComplete="password"
        textContentType="password"
        placeholder="Your password"
        editable={!busy}
        onSubmitEditing={() => void onSubmit()}
      />
      <PrimaryButton label="Sign in" onPress={() => void onSubmit()} loading={busy} />
      <View style={styles.links}>
        <Link href="/forgot-password" asChild>
          <Pressable style={styles.link} accessibilityRole="link" accessibilityLabel="Forgot password">
            <Text style={styles.linkTxt}>Forgot password?</Text>
          </Pressable>
        </Link>
        <Link href="/signup" asChild>
          <Pressable style={styles.link} accessibilityRole="link" accessibilityLabel="Create an account">
            <Text style={[styles.linkTxt, styles.linkMuted]}>
              New here? <Text style={styles.linkTxt}>Create an account</Text>
            </Text>
          </Pressable>
        </Link>
        {isLocalEnv ? (
          <Pressable
            onPress={() => void onDevAnon()}
            disabled={busy}
            style={styles.link}
            accessibilityRole="button"
            accessibilityLabel="Continue anonymously (dev only)"
          >
            <Text style={styles.devLinkTxt}>Continue anonymously (dev only)</Text>
          </Pressable>
        ) : null}
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  links: { marginTop: theme.spaceXl, gap: theme.spaceLg, alignItems: "center" },
  link: { minHeight: 28, justifyContent: "center" },
  linkTxt: { fontSize: 15, fontWeight: "800", color: theme.accentSecondary },
  linkMuted: { color: theme.textSecondary, fontWeight: "600" },
  devLinkTxt: { fontSize: 13, fontWeight: "600", color: theme.textMuted, textDecorationLine: "underline" },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceMd,
    backgroundColor: theme.officialBg,
    borderRadius: theme.radiusMd,
    padding: theme.spaceMd,
    marginBottom: theme.spaceLg,
    borderWidth: 1,
    borderColor: theme.officialText + "55",
  },
  bannerTitle: { fontSize: 15, fontWeight: "800", color: theme.text, marginBottom: 2 },
  bannerBody: { fontSize: 14, fontWeight: "500", color: theme.textSecondary, lineHeight: 20 },
});
