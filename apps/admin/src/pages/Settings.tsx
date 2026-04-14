import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, fetchAdminUsers } from "../lib/api";
import { IconShield } from "../components/Icons";

type Role = "admin" | "user";

export default function Settings() {
  const qc = useQueryClient();
  const usersQ = useQuery({
    queryKey: ["admin-users", 1, 100],
    queryFn: () => fetchAdminUsers(1, 100),
  });
  const admins = (usersQ.data?.users ?? []).filter((u) => u.is_admin);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: async (res) => {
      setSuccess(`Created ${res.user.email} as ${res.user.role}.`);
      setError(null);
      setEmail("");
      setDisplayName("");
      setPassword("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : String(e));
      setSuccess(null);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    create.mutate({
      email: email.trim(),
      password,
      role,
      display_name: displayName.trim() || undefined,
    });
  }

  function suggestPassword() {
    // 14-char dev-friendly password that meets the server rules (upper/lower/digit, ≥10).
    const alpha = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    let pw = "";
    for (let i = 0; i < 10; i++) pw += alpha[Math.floor(Math.random() * alpha.length)];
    for (let i = 0; i < 4; i++) pw += digits[Math.floor(Math.random() * digits.length)];
    setPassword(pw);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="kicker">System</div>
          <h1>Settings</h1>
          <div className="sub">Roster management and admin-only operations.</div>
        </div>
      </div>

      <div className="card">
        <h2>Create user</h2>
        <p className="hint" style={{ marginTop: -8, marginBottom: 18 }}>
          Accounts created here are pre-confirmed and can sign in immediately. Share the password out of band;
          users should rotate it on first sign-in via &ldquo;Forgot password&rdquo;.
        </p>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="display">Display name (optional)</label>
              <input
                id="display"
                type="text"
                maxLength={32}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jamie T."
              />
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="password">Password <span style={{ color: "var(--text-muted)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(min 10 chars · upper · lower · digit)</span></label>
              <input
                id="password"
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="StrongPassword1"
                autoComplete="off"
                style={{ fontFamily: "monospace" }}
              />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn" onClick={suggestPassword}>Suggest</button>
                <button type="submit" className="btn primary" disabled={create.isPending} style={{ flex: 1 }}>
                  {create.isPending ? "Creating…" : `Create ${role}`}
                </button>
              </div>
            </div>
          </div>
          {error ? <div className="error">{error}</div> : null}
          {success ? <div className="success">{success}</div> : null}
        </form>
      </div>

      <div className="card flush">
        <div style={{ padding: "20px 20px 16px" }}>
          <h2 style={{ margin: 0 }}>
            Administrators <span className="sub">{admins.length} active</span>
          </h2>
        </div>
        {usersQ.isLoading ? (
          <div className="empty">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="empty">No administrators. Create one above.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "var(--accent)" }}><IconShield /></span>
                        <strong>{u.display_name ?? "—"}</strong>
                      </span>
                    </td>
                    <td>{u.email ?? <span className="muted">—</span>}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : <span className="muted">never</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="hint" style={{ padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
          To promote an existing user or demote an admin, use the <strong>Users</strong> page. Changes take effect
          immediately.
        </div>
      </div>

      <div className="card">
        <h2>Roles</h2>
        <p className="hint" style={{ marginTop: -8 }}>
          Roles are stored as <code>user_profiles.is_admin</code> (boolean). Every account is either:
        </p>
        <div className="role-legend">
          <div className="role-row">
            <span className="pill admin">Admin</span>
            <span>Full access to this dashboard, including user management and moderation.</span>
          </div>
          <div className="role-row">
            <span className="pill anon">User</span>
            <span>Standard collector account. No admin dashboard access.</span>
          </div>
        </div>
        <p className="hint">
          Role changes can only be made by an existing admin (enforced server-side by the{" "}
          <code>admin-set-role</code> Edge Function). RLS prevents users from promoting themselves.
        </p>
      </div>
    </div>
  );
}
