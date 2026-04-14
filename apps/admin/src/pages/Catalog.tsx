import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCar, deleteCar, fetchCatalog, type CatalogCar, type CreateCarInput } from "../lib/api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconTrash } from "../components/Icons";

const LINE_TYPES: CatalogCar["line_type"][] = ["Mainline", "Premium", "RLC", "TeamTransport", "Entertainment", "Other"];
const TH_TYPES: CatalogCar["treasure_hunt_type"][] = ["None", "TH", "STH"];
const PER_PAGE = 50;

export default function Catalog() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CatalogCar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const carsQ = useQuery({
    queryKey: ["admin-catalog", page, PER_PAGE, search],
    queryFn: () => fetchCatalog(page, PER_PAGE, search),
  });

  // Form state
  const [castingName, setCastingName] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [series, setSeries] = useState("");
  const [lineType, setLineType] = useState<CatalogCar["line_type"]>("Mainline");
  const [thType, setThType] = useState<CatalogCar["treasure_hunt_type"]>("None");
  const [sku, setSku] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [barcode, setBarcode] = useState("");

  const create = useMutation({
    mutationFn: createCar,
    onSuccess: async (res) => {
      setSuccess(
        `Created "${castingName}"${res.barcode_error ? ` (barcode error: ${res.barcode_error})` : ""}.`,
      );
      setError(null);
      setCastingName("");
      setSeries("");
      setSku("");
      setModelNumber("");
      setBarcode("");
      await qc.invalidateQueries({ queryKey: ["admin-catalog"] });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : String(e));
      setSuccess(null);
    },
  });

  const del = useMutation({
    mutationFn: (c: CatalogCar) => deleteCar(c.id),
    onSuccess: async () => {
      setPendingDelete(null);
      await qc.invalidateQueries({ queryKey: ["admin-catalog"] });
    },
    onError: (e) => {
      setPendingDelete(null);
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const input: CreateCarInput = {
      casting_name: castingName.trim(),
      year: Number(year),
      series: series.trim() || null,
      line_type: lineType,
      treasure_hunt_type: thType,
      model_number: modelNumber.trim() || null,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
    };
    create.mutate(input);
  }

  const cars = carsQ.data?.cars ?? [];
  const total = carsQ.data?.total ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="kicker">Manage</div>
          <h1>Catalog</h1>
          <div className="sub">Canonical Hot Wheels castings. Users search and add from this list.</div>
        </div>
        <div className="tools">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search casting name…"
            style={{ width: 280 }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Add casting</h2>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="cast">Casting name</label>
              <input id="cast" required value={castingName} onChange={(e) => setCastingName(e.target.value)} placeholder="e.g. Twin Mill" />
            </div>
            <div className="field">
              <label htmlFor="year">Year</label>
              <input id="year" type="number" min={1960} max={2100} required value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="series">Series</label>
              <input id="series" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="e.g. HW Art Cars" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="line">Line type</label>
              <select id="line" value={lineType} onChange={(e) => setLineType(e.target.value as CatalogCar["line_type"])}>
                {LINE_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="th">Treasure Hunt</label>
              <select id="th" value={thType} onChange={(e) => setThType(e.target.value as CatalogCar["treasure_hunt_type"])}>
                {TH_TYPES.map((t) => <option key={t} value={t}>{t === "None" ? "None" : t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sku">SKU (optional)</label>
              <input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="model">Model # (optional)</label>
              <input id="model" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="barcode">Barcode (optional)</label>
              <input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="e.g. 0194735100001" />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button type="submit" className="btn primary" disabled={create.isPending} style={{ width: "100%" }}>
                {create.isPending ? "Adding…" : "Add to catalog"}
              </button>
            </div>
          </div>
          {error ? <div className="error">{error}</div> : null}
          {success ? <div className="success">{success}</div> : null}
        </form>
      </div>

      <div className="card flush">
        <div style={{ padding: "20px 20px 16px" }}>
          <h2 style={{ margin: 0 }}>
            Catalog <span className="sub">{total.toLocaleString()} total</span>
          </h2>
        </div>
        {carsQ.isLoading ? (
          <div className="empty">Loading…</div>
        ) : cars.length === 0 ? (
          <div className="empty">No castings {search ? `match "${search}"` : "in the catalog yet"}.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Casting</th>
                  <th>Year</th>
                  <th>Series</th>
                  <th>Line</th>
                  <th>TH</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.casting_name}</div>
                      <div className="sub-text" style={{ fontFamily: "monospace" }}>{c.id.slice(0, 8)}</div>
                    </td>
                    <td>{c.year}</td>
                    <td>{c.series ?? <span className="muted">—</span>}</td>
                    <td>{c.line_type}</td>
                    <td>
                      {c.treasure_hunt_type === "None" ? (
                        <span className="muted">—</span>
                      ) : (
                        <span className="pill admin">{c.treasure_hunt_type}</span>
                      )}
                    </td>
                    <td className="right">
                      <button className="btn sm danger" onClick={() => setPendingDelete(c)}>
                        <IconTrash /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-foot">
          <span>Showing {cars.length} of {total.toLocaleString()} · page {page}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button className="btn sm" disabled={page * PER_PAGE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete casting?"
        message={
          pendingDelete
            ? `${pendingDelete.casting_name} (${pendingDelete.year}). This removes it from the catalog and every user's garage entry that references it.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        busy={del.isPending}
        onConfirm={() => pendingDelete && del.mutate(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
