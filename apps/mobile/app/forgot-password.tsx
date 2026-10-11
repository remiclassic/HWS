import { useCallback } from "react";
import { Text } from "react-native";
import { Link, router } from "expo-router";
import { AuthForm, authFooterLinkStyle } from "../components/auth/AuthForm";
import { sendPasswordReset } from "../lib/auth";

export default function ForgotPasswordScreen() {
  const onSubmit = useCallback(async (email: string) => {
    await sendPasswordReset(email);
    // Alert callbacks don't fire on web — hand off to login, which shows the confirmation.
    router.replace({ pathname: "/login", params: { resetSent: "1", email } });
  }, []);

  return (
    <AuthForm
      icon="lock-reset"
      title="Reset password"
      subtitle="Enter your email and we’ll send you a reset link."
      submitLabel="Send reset email"
      emailOnly
      onSubmit={onSubmit}
      footer={
        <Link href="/login" replace accessibilityRole="link">
          <Text style={authFooterLinkStyle}>Back to sign in</Text>
        </Link>
      }
    />
  );
}
