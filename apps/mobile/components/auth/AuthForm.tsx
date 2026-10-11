import { memo, useCallback, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PrimaryButton } from "../ui/PrimaryButton";
import { TextField } from "../ui/TextField";
import { errorMessage } from "../../lib/errors";
import { theme, themedScrollIndicatorProps } from "../../lib/theme";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  submitLabel: string;
  initialEmail?: string;
  initialPassword?: string;
  /** Reset-password style form: no password field; `onSubmit` receives an empty password */
  emailOnly?: boolean;
  /** Sign-up: switches autofill to "new password" and shows `passwordHint` */
  newPassword?: boolean;
  passwordHint?: string;
  /** Return the rule that failed, or null when the password is acceptable */
  validatePassword?: (password: string) => string | null;
  /** Good news above the fields ("Account created", "Check your email") */
  notice?: { title: string; body: string } | null;
  onSubmit: (email: string, password: string) => Promise<void>;
  /** Link(s) to the sibling flows, under the button */
  footer?: ReactNode;
};

/** Email (+ password) screen body shared by sign in, sign up, and password reset. */
export const AuthForm = memo(function AuthForm({
  icon,
  title,
  subtitle,
  submitLabel,
  initialEmail = "",
  initialPassword = "",
  emailOnly,
  newPassword,
  passwordHint,
  validatePassword,
  notice,
  onSubmit,
  footer,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const trimmed = email.trim();
    const eErr = !trimmed ? "Enter your email." : EMAIL_RE.test(trimmed) ? null : "That doesn’t look like an email.";
    const pErr = emailOnly
      ? null
      : !password
        ? "Enter your password."
        : (validatePassword?.(password) ?? null);
    setEmailError(eErr);
    setPasswordError(pErr);
    setSubmitError(null);
    if (eErr || pErr) return;

    setBusy(true);
    try {
      await onSubmit(trimmed, emailOnly ? "" : password);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [email, password, emailOnly, validatePassword, onSubmit]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        {...themedScrollIndicatorProps}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <View style={styles.iconDisc}>
            <MaterialCommunityIcons name={icon} size={28} color={theme.accentSecondary} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {notice ? (
            <View style={[styles.banner, styles.noticeBanner]} accessibilityRole="alert">
              <MaterialCommunityIcons name="check-circle" size={20} color={theme.success} />
              <View style={styles.bannerText}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeBody}>{notice.body}</Text>
              </View>
            </View>
          ) : null}

          {submitError ? (
            <View style={[styles.banner, styles.errorBanner]} accessibilityRole="alert">
              <MaterialCommunityIcons name="alert-circle" size={20} color={theme.danger} />
              <Text style={styles.errorBannerTxt}>{submitError}</Text>
            </View>
          ) : null}

          <TextField
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(null);
            }}
            error={emailError}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType={emailOnly ? "go" : "next"}
            onSubmitEditing={emailOnly ? () => void submit() : undefined}
            editable={!busy}
          />
          {emailOnly ? null : (
            <TextField
              label="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError(null);
              }}
              error={passwordError}
              hint={passwordHint}
              secure
              autoCapitalize="none"
              autoComplete={newPassword ? "new-password" : "current-password"}
              textContentType={newPassword ? "newPassword" : "password"}
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              editable={!busy}
            />
          )}

          <PrimaryButton label={submitLabel} onPress={() => void submit()} loading={busy} />
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

/** Text link for the form footer ("Already have an account? Sign in"). */
export const authFooterLinkStyle = {
  fontSize: 15,
  fontWeight: "700" as const,
  color: theme.accentSecondary,
  paddingVertical: theme.spaceSm,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { flexGrow: 1, padding: theme.spaceLg, paddingTop: theme.spaceXl, paddingBottom: theme.space3xl },
  inner: { width: "100%", maxWidth: 440, alignSelf: "center" },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentSecondaryMuted,
    marginBottom: theme.spaceLg,
  },
  title: { ...theme.typeTitleLg, color: theme.text },
  subtitle: {
    marginTop: theme.spaceSm,
    marginBottom: theme.spaceXl,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: theme.textSecondary,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spaceSm,
    padding: theme.spaceMd,
    marginBottom: theme.spaceLg,
    borderRadius: theme.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: { flex: 1 },
  noticeBanner: { backgroundColor: theme.officialBg, borderColor: theme.officialText + "44" },
  noticeTitle: { fontSize: 14, fontWeight: "800", color: theme.text },
  noticeBody: { marginTop: 2, fontSize: 14, lineHeight: 20, fontWeight: "500", color: theme.textSecondary },
  errorBanner: { backgroundColor: theme.dangerSurface, borderColor: theme.dangerBorder },
  errorBannerTxt: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600", color: theme.danger },
  footer: { marginTop: theme.spaceLg, gap: theme.spaceXs },
});
