import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  banUser,
  deleteUser,
  fetchAdminUsers,
  setUserRole,
  unbanUser,
  type AdminUser,
} from "../lib/api";
import { ConfirmDialog } from "../components/ConfirmDialog";

type Filter = "all" | "admins" | "banned" | "new";

type Pending =
  | { kind: "ban" | "unban" | "delete" | "promote" | "demote"; user: AdminUser }
  | null;

const PER_PAGE = 25;

export default function Users() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  const usersQ = useQuery({
    queryKey: ["admin-users", page, PER_PAGE],
    queryFn: () => fetchAdminUsers(page, PER_PAGE),
  });

  const action = useMutation({
    mutationFn: async (p: NonNullable<Pending>) => {
      if (p.kind === "ban") return banUser(p.user.id);
      if (p.kind === "unban") return unbanUser(p.user.id);
      if (p.kind === "delete") return deleteUser(p.user.id);
      return setUserRole(p.user.id, p.kind === "promote");
    },
    onSuccess: async () => {
      setPending(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (e) => {
      setPending(null);
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  const filtered = useMemo(() => {
    const all = usersQ.data?.users ?? [];
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return all.filter((u) => {
      if (filter === "admins" && !u.is_admin) return false;
      if (filter === "banned" && !(u.banned_until && new Date(u.banned_until).getTime() > now)) return false;
      if (filter === "new" && new Date(u.created_at).getTime() < weekAgo) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${u.email ?? ""} ${u.display_name ?? ""} ${u.id}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [usersQ.data, filter, search]);

  const total = usersQ.data?.total ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="kicker">Manage</div>
          <h1>Users</h1>
          <div className="sub">{total.toLocaleString()} total · ban, unban, delete, or change role.</div>
        </div>
        <div className="tools">
          <div className="segmented">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
            <button className={filter === "new" ? "active" : ""} onClick={() => setFilter("new")}>New</button>
            <button className={filter === "admins" ? "active" : ""} onClick={() => setFilter("admins")}>Admins</button>
            <button className={filter === "banned" ? "active" : ""} onClick={() => setFilter("banned")}>Banned</button>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or id…"
            style={{ width: 260 }}
          />
        </div>
      </div>

      <div className="card flush">
        {error ? <div className="error" style={{ padding: "14px 20px" }}>{error}</div> : null}
        {usersQ.isLoading ? (
          <div className="empty">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No users match your filters.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last sign-in</th>
                  <th className="right">Garage</th>
                  <th className="right">Photos</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const banned = u.banned_until && new Date(u.banned_until) > new Date();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{u.email ?? <span className="muted">(anonymous)</span>}</div>
                        <div className="sub-text">{u.display_name ?? "—"} · <span style={{ fontFamily: "monospace" }}>{u.id.slice(0, 8)}</span></div>
                      </td>
                      <td>
                        <span className={`pill ${u.is_admin ? "admin" : "anon"}`}>{u.is_admin ? "Admin" : "User"}</span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : <span className="muted">never</span>}</td>
                      <td className="right">{u.garage_count.toLocaleString()}</td>
                      <td className="right">{u.photo_count.toLocaleString()}</td>
                      <td>
                        {banned ? <span className="pill banned">Banned</span> : <span className="pill anon dot">Active</span>}
                      </td>
                      <td className="right">
                        <div className="row-actions">
                          {u.is_admin ? (
                            <button className="btn sm" onClick={() => setPending({ kind: "demote", user: u })}>
                              Demote
                            </button>
                          ) : (
                            <button className="btn sm" onClick={() => setPending({ kind: "promote", user: u })}>
                              Promote
                            </button>
                          )}
                          {banned ? (
                            <button className="btn sm" onClick={() => setPending({ kind: "unban", user: u })}>
                              Unban
                            </button>
                          ) : (
                            <button
                              className="btn sm"
                              disabled={u.is_admin}
                              onClick={() => setPending({ kind: "ban", user: u })}
                            >
                              Ban
                            </button>
                          )}
                          <button
                            className="btn sm danger"
                            disabled={u.is_admin}
                            onClick={() => setPending({ kind: "delete", user: u })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-foot">
          <span>Showing {filtered.length} of {total.toLocaleString()} · page {page}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button className="btn sm" disabled={(page * PER_PAGE) >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={titleFor(pending)}
        message={messageFor(pending)}
        confirmLabel={confirmLabelFor(pending)}
        destructive={pending?.kind === "delete" || pending?.kind === "ban"}
        busy={action.isPending}
        onConfirm={() => pending && action.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function titleFor(p: Pending): string {
  switch (p?.kind) {
    case "ban": return "Ban user for 30 days?";
    case "unban": return "Unban user?";
    case "delete": return "Delete user?";
    case "promote": return "Promote to admin?";
    case "demote": return "Demote from admin?";
    default: return "";
  }
}
function messageFor(p: Pending): string {
  if (!p) return "";
  const who = p.user.email ?? p.user.id;
  switch (p.kind) {
    case "ban": return `${who} will be unable to sign in until the ban expires.`;
    case "unban": return `${who} will be able to sign in again immediately.`;
    case "delete": return `${who} — all garage data and photos will be permanently removed. This cannot be undone.`;
    case "promote": return `Grant ${who} full admin privileges, including user management.`;
    case "demote": return `Revoke admin privileges from ${who}. They will remain a regular user.`;
  }
}
function confirmLabelFor(p: Pending): string {
  switch (p?.kind) {
    case "ban": return "Ban";
    case "unban": return "Unban";
    case "delete": return "Delete";
    case "promote": return "Promote";
    case "demote": return "Demote";
    default: return "Confirm";
  }
}
