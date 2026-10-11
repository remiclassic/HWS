import { useCallback } from "react";
import { Text } from "react-native";
import { Link, router } from "expo-router";
import { AuthForm, authFooterLinkStyle } from "../components/auth/AuthForm";
import { signUpWithPassword } from "../lib/auth";

// Mirror the server-side rule: min 10 chars, at least one lower, one upper, one digit.
function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/\d/.test(pw)) return "Password must include a number.";
  return null;
}

export default function SignupScreen() {
  const onSubmit = useCallback(async (email: string, password: string) => {
    const { needsConfirmation } = await signUpWithPassword(email, password);
    if (needsConfirmation) {
      // Can't rely on Alert callbacks on web; push straight to login with a banner flag.
      router.replace({ pathname: "/login", params: { justSignedUp: "1", email } });
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  return (
    <AuthForm
      icon="account-plus-outline"
      title="Create account"
      subtitle="Start your Spotter garage. We’ll email you a link to confirm the address."
      submitLabel="Create account"
      newPassword
      passwordHint="At least 10 characters, with upper and lower case and a number."
      validatePassword={validatePassword}
      onSubmit={onSubmit}
      footer={
        <Link href="/login" replace accessibilityRole="link">
          <Text style={authFooterLinkStyle}>Already have an account? Sign in</Text>
        </Link>
      }
    />
  );
}
