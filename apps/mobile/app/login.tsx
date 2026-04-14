import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Card } from "../components/ui/Card";
import { signInWithPassword, signInAnonymouslyDev } from "../lib/auth";
import { isLocalEnv } from "../lib/supabase";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

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

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert("Sign in", "Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      await signInWithPassword(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [email, password]);

  const onDevAnon = useCallback(async () => {
    setBusy(true);
    try {
      await signInAnonymouslyDev();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Anonymous sign-in failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="Sign in">
        {justSignedUp ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Account created</Text>
            <Text style={styles.bannerBody}>
              {isLocalEnv
                ? "Sign in now with the password you just set."
                : "Check your inbox for a confirmation link, then sign in."}
            </Text>
          </View>
        ) : null}
        <Text style={styles.hint}>Use the email and password you registered with.</Text>
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
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
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
          accessibilityLabel="Sign in"
        >
          {busy ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.primaryBtnTxt}>Sign in</Text>
          )}
        </Pressable>
        <Link href="/forgot-password" asChild>
          <Pressable style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Forgot password">
            <Text style={styles.linkTxt}>Forgot password?</Text>
          </Pressable>
        </Link>
        <Link href="/signup" asChild>
          <Pressable style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Create an account">
            <Text style={styles.linkTxt}>Create an account</Text>
          </Pressable>
        </Link>
        {isLocalEnv ? (
          <Pressable
            onPress={() => void onDevAnon()}
            disabled={busy}
            style={styles.devLink}
            accessibilityRole="button"
            accessibilityLabel="Continue anonymously (dev only)"
          >
            <Text style={styles.devLinkTxt}>Continue anonymously (dev only)</Text>
          </Pressable>
        ) : null}
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
  devLink: { marginTop: theme.spaceXl, alignItems: "center" },
  devLinkTxt: { fontSize: 13, fontWeight: "600", color: theme.textMuted, textDecorationLine: "underline" },
  banner: {
    backgroundColor: theme.accentMuted,
    borderRadius: theme.radiusMd,
    padding: theme.spaceMd,
    marginBottom: theme.spaceMd,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800", color: theme.text, marginBottom: 4 },
  bannerBody: { fontSize: 13, fontWeight: "500", color: theme.textSecondary, lineHeight: 18 },
});
