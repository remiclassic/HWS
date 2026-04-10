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
import { router } from "expo-router";
import { Card } from "../components/ui/Card";
import { authLinkEmail } from "../lib/api";
import { applyAuthToken } from "../lib/authSession";
import { theme, themedScrollIndicatorProps } from "../lib/theme";

export default function LinkEmailScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert("Link email", "Enter email and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Link email", "Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await authLinkEmail({
        email: email.trim(),
        password,
      });
      await applyAuthToken(token);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Could not link email", String(e));
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
      <Card title="Link email to this device">
        <Text style={styles.hint}>
          Keeps your current garage and progress on the same profile. You can sign in with this email on another
          device. If the email is already registered, sign in instead or use a different address.
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
          accessibilityLabel="Link email"
        >
          {busy ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.primaryBtnTxt}>Save and link</Text>
          )}
        </Pressable>
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
});
