import { useState } from "react";
import { signIn } from "../lib/auth";

// Dev prefill — the seeded admin user. Release builds won't use import.meta.env.DEV.
const IS_DEV = import.meta.env.DEV;
const DEV_EMAIL = "admin@hotwheels.local";
const DEV_PASSWORD = "admin-password-AA1";

export default function LoginPage() {
  const [email, setEmail] = useState(IS_DEV ? DEV_EMAIL : "");
  const [password, setPassword] = useState(IS_DEV ? DEV_PASSWORD : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card">
        <div className="kicker">Administration</div>
        <h1 style={{ marginTop: 4 }}>Sign in</h1>
        <p className="hint" style={{ marginTop: 12 }}>
          Admin-only portal. Use an account with <code>is_admin = true</code>.
        </p>
        <form onSubmit={onSubmit}>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
          {error ? <div className="error">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
