import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { AuthForm, authFooterLinkStyle } from "../components/auth/AuthForm";
import { useToast } from "../components/ui/Toast";
import { signInWithPassword, signInAnonymouslyDev } from "../lib/auth";
import { errorMessage } from "../lib/errors";
import { isLocalEnv } from "../lib/supabase";
import { theme } from "../lib/theme";

// Dev convenience: prefill with the seeded test user when running locally.
// See supabase/seed.sql. Release builds never see these defaults.
const DEV_EMAIL = "dev@hotwheels.local";
const DEV_PASSWORD = "dev-password-AA1";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ justSignedUp?: string; resetSent?: string; email?: string }>();
  const justSignedUp = params.justSignedUp === "1";
  const resetSent = params.resetSent === "1";
  const incomingEmail = typeof params.email === "string" ? params.email : "";
  const toast = useToast();
  const [devBusy, setDevBusy] = useState(false);

  const onSubmit = useCallback(async (email: string, password: string) => {
    await signInWithPassword(email, password);
    router.replace("/(tabs)");
  }, []);

  const onDevAnon = useCallback(async () => {
    setDevBusy(true);
    try {
      await signInAnonymouslyDev();
      router.replace("/(tabs)");
    } catch (e) {
      toast.show({ kind: "error", message: errorMessage(e) });
    } finally {
      setDevBusy(false);
    }
  }, [toast]);

  const notice = justSignedUp
    ? {
        title: "Account created",
        body: isLocalEnv
          ? "Sign in now with the password you just set."
          : "Check your inbox for a confirmation link, then sign in.",
      }
    : resetSent
      ? {
          title: "Check your email",
          // Generic on purpose — don't leak whether the address has an account.
          body: "If an account exists for that address, we sent a reset link.",
        }
      : null;

  return (
    <AuthForm
      icon="login"
      title="Welcome back"
      subtitle="Sign in to open your garage."
      submitLabel="Sign in"
      initialEmail={incomingEmail || (isLocalEnv ? DEV_EMAIL : "")}
      initialPassword={incomingEmail ? "" : isLocalEnv ? DEV_PASSWORD : ""}
      notice={notice}
      onSubmit={onSubmit}
      footer={
        <>
          <Link href="/forgot-password" accessibilityRole="link">
            <Text style={authFooterLinkStyle}>Forgot password?</Text>
          </Link>
          <Link href="/signup" replace accessibilityRole="link">
            <Text style={authFooterLinkStyle}>New here? Create an account</Text>
          </Link>
          {isLocalEnv ? (
            <Pressable
              onPress={() => void onDevAnon()}
              disabled={devBusy}
              accessibilityRole="button"
              accessibilityLabel="Continue anonymously (dev only)"
            >
              <Text style={[authFooterLinkStyle, styles.devLink]}>Continue anonymously (dev only)</Text>
            </Pressable>
          ) : null}
        </>
      }
    />
  );
}

const styles = {
  devLink: { color: theme.textMuted, fontSize: 13 },
};
