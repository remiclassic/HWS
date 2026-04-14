import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePhoto, fetchAdminPhotos, type AdminPhoto } from "../lib/api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconTrash } from "../components/Icons";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function Content() {
  const qc = useQueryClient();
  const photosQ = useQuery({ queryKey: ["admin-photos", 30], queryFn: () => fetchAdminPhotos(30) });
  const [pending, setPending] = useState<AdminPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: (p: AdminPhoto) => deletePhoto(p.id),
    onSuccess: async () => {
      setPending(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-photos"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (e) => {
      setPending(null);
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  const photos = photosQ.data?.photos ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="kicker">Manage</div>
          <h1>Content moderation</h1>
          <div className="sub">Recent user-uploaded photos. Remove offensive or off-topic content.</div>
        </div>
      </div>

      <div className="card">
        <h2>Recent photos <span className="sub">{photos.length} shown</span></h2>
        {error ? <div className="error">{error}</div> : null}
        {photosQ.isLoading ? (
          <div className="empty">Loading…</div>
        ) : photos.length === 0 ? (
          <div className="empty">No photos uploaded yet.</div>
        ) : (
          <div className="photo-grid">
            {photos.map((p) => (
              <div key={p.id} className="photo-card">
                <div
                  className="thumb"
                  style={p.url ? { backgroundImage: `url(${p.url})` } : undefined}
                  aria-label={`${p.casting_name} (${p.year})`}
                />
                <div className="meta">
                  <div className="cast">{p.casting_name}</div>
                  <div className="sub">
                    {p.year} · {fmtBytes(p.byte_size)} · {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  <div className="sub" style={{ fontFamily: "monospace", marginTop: 4 }}>{p.user_id.slice(0, 8)}</div>
                </div>
                <div className="actions">
                  <span className="pill anon">{p.mime_type.replace("image/", "")}</span>
                  <button
                    className="btn sm danger"
                    onClick={() => setPending(p)}
                    aria-label="Delete photo"
                  >
                    <IconTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Delete this photo?"
        message={pending ? `${pending.casting_name} (${pending.year}) uploaded by ${pending.user_id.slice(0, 8)}. This removes the Storage object and the DB row. The user's garage entry stays.` : ""}
        confirmLabel="Delete"
        destructive
        busy={del.isPending}
        onConfirm={() => pending && del.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
