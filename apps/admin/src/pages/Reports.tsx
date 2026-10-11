import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminReports, updateReport } from "../lib/api";

type StatusFilter = "open" | "triaged" | "closed" | "all";

export default function Reports() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [error, setError] = useState<string | null>(null);

  const reportsQ = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => fetchAdminReports(status),
  });

  const upd = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "open" | "triaged" | "closed" }) => updateReport(id, next),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-reports"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const reports = reportsQ.data?.reports ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="kicker">Manage</div>
          <h1>Data reports</h1>
          <div className="sub">Corrections submitted by users against the catalog.</div>
        </div>
        <div className="tools">
          <div className="segmented">
            {(["open", "triaged", "closed", "all"] as StatusFilter[]).map((s) => (
              <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card flush">
        {error ? <div className="error" style={{ padding: "14px 20px" }}>{error}</div> : null}
        {reportsQ.isLoading ? (
          <div className="empty">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="empty">No {status === "all" ? "" : status} reports.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Car</th>
                  <th>Field</th>
                  <th>Message</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.canonical_cars?.casting_name ?? "—"}</div>
                      <div className="sub-text">{r.canonical_cars?.year ?? ""}</div>
                    </td>
                    <td>{r.field_path ?? <span className="muted">—</span>}</td>
                    <td style={{ maxWidth: 440 }}>{r.message}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`pill ${r.status}`}>{r.status}</span>
                    </td>
                    <td className="right">
                      <div className="row-actions">
                        {r.status !== "triaged" ? (
                          <button className="btn sm" disabled={upd.isPending} onClick={() => upd.mutate({ id: r.id, next: "triaged" })}>
                            Triage
                          </button>
                        ) : null}
                        {r.status !== "closed" ? (
                          <button className="btn sm primary" disabled={upd.isPending} onClick={() => upd.mutate({ id: r.id, next: "closed" })}>
                            Close
                          </button>
                        ) : (
                          <button className="btn sm" disabled={upd.isPending} onClick={() => upd.mutate({ id: r.id, next: "open" })}>
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
