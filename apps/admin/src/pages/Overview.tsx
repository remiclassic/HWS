import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats, fetchAdminUsers } from "../lib/api";
import { IconArrowUp } from "../components/Icons";

export default function Overview() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: fetchAdminStats });
  const recent = useQuery({
    queryKey: ["admin-users", 1, 8],
    queryFn: () => fetchAdminUsers(1, 8),
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="kicker">Overview</div>
          <h1>Dashboard</h1>
          <div className="sub">System health, activity, and moderation queue at a glance.</div>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Total users"
          value={stats.data?.users_total ?? 0}
          delta={stats.data ? `+${stats.data.users_new_7d} this week` : ""}
          deltaKind={stats.data && stats.data.users_new_7d > 0 ? "up" : "flat"}
          hint={stats.data ? `${stats.data.users_new_24h} in the last 24h` : ""}
        />
        <Kpi
          label="Admins"
          value={stats.data?.admins_total ?? 0}
          hint="Users with is_admin = true"
        />
        <Kpi
          label="Garage rows"
          value={stats.data?.garage_rows_total ?? 0}
          hint="Cars saved across all users"
        />
        <Kpi
          label="Photos"
          value={stats.data?.photos_total ?? 0}
          hint="User-uploaded images"
        />
        <Kpi
          label="Open reports"
          value={stats.data?.reports_open ?? 0}
          deltaKind={stats.data && stats.data.reports_open > 0 ? "warn" : "flat"}
          delta={stats.data && stats.data.reports_open > 0 ? "needs triage" : "all clear"}
          hint="Data reports from users"
        />
        <Kpi
          label="New (24h)"
          value={stats.data?.users_new_24h ?? 0}
          hint="Signups in the last day"
        />
      </div>

      <div className="card">
        <h2>Recent signups <span className="sub">last {recent.data?.users.length ?? 0}</span></h2>
        {recent.isLoading ? (
          <div className="muted">Loading…</div>
        ) : (recent.data?.users ?? []).length === 0 ? (
          <div className="empty">No users yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Created</th>
                  <th>Last sign-in</th>
                  <th className="right">Garage</th>
                  <th className="right">Photos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(recent.data?.users ?? []).map((u) => {
                  const banned = u.banned_until && new Date(u.banned_until) > new Date();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{u.email ?? <span className="muted">(anonymous)</span>}</div>
                        <div className="sub-text">{u.display_name ?? "—"}</div>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : <span className="muted">never</span>}</td>
                      <td className="right">{u.garage_count}</td>
                      <td className="right">{u.photo_count}</td>
                      <td>
                        {u.is_admin ? <span className="pill admin">Admin</span> : null}{" "}
                        {banned ? <span className="pill banned">Banned</span> : null}
                        {!u.is_admin && !banned ? <span className="pill anon dot">Active</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaKind = "flat",
  hint,
}: {
  label: string;
  value: number;
  delta?: string;
  deltaKind?: "up" | "warn" | "flat";
  hint?: string;
}) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value.toLocaleString()}</div>
      {delta ? (
        <div className={`delta ${deltaKind}`}>
          {deltaKind === "up" ? <IconArrowUp /> : null} {delta}
        </div>
      ) : null}
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
