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
import { authRegister } from "../lib/api";
import { applyAuthToken } from "../lib/authSession";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert("Create account", "Enter email and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Create account", "Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await authRegister({
        email: email.trim(),
        password,
      });
      await applyAuthToken(token);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Could not create account", String(e));
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
      <Card title="Create account">
        <Text style={styles.hint}>
          Creates a new Spotter profile with this email. To keep your current garage, use “Link email” in Settings
          instead.
        </Text>
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
        <Text style={styles.label}>Password (min 8 characters)</Text>
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
          accessibilityLabel="Create account"
        >
          {busy ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.primaryBtnTxt}>Create account</Text>
          )}
        </Pressable>
        <Link href="/login" asChild>
          <Pressable style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Sign in instead">
            <Text style={styles.linkTxt}>Already have an account? Sign in</Text>
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
