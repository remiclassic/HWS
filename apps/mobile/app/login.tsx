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
import { authLogin } from "../lib/api";
import { applyAuthToken } from "../lib/authSession";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert("Sign in", "Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await authLogin({
        email: email.trim(),
        password,
      });
      await applyAuthToken(token);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Sign in failed", String(e));
    } finally {
      setBusy(false);
    }
  }, [email, password]);

  return (
    <ScrollView
      {...themedScrollIndicatorProps}
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="Sign in">
        <Text style={styles.hint}>Use the email and password you registered with.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
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
          placeholder="••••••••"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          editable={!busy}
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
        <Link href="/signup" asChild>
          <Pressable style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Create an account">
            <Text style={styles.linkTxt}>Create an account</Text>
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
