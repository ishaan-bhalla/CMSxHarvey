import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { analyze, fetchDocuments } from "../lib/api";
import { analysisStore } from "../lib/analysis-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Upload — Witness Statement Analysis" },
      {
        name: "description",
        content:
          "Select witness statements for cross-referenced analysis against the Post Office Horizon IT Inquiry record.",
      },
    ],
  }),
  component: UploadPage,
});

function extractName(filename: string): string {
  const m = filename.match(/WITN\d+\s*-\s*([^-]+?)\s*-/i);
  if (m) return m[1].trim();
  return filename.replace(/\.pdf$/i, "");
}

function UploadPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<string[] | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [primary, setPrimary] = useState<string>("");
  const [comparisons, setComparisons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments()
      .then((r) => setDocs(r.documents))
      .catch((e) =>
        setDocError(
          e instanceof TypeError
            ? "Backend not reachable at http://127.0.0.1:8000"
            : (e as Error).message,
        ),
      );
  }, []);

  const filteredDocs = useMemo(
    () => (docs ?? []).filter((d) => d !== primary),
    [docs, primary],
  );

  const canAnalyse =
    primary && comparisons.length >= 2 && comparisons.length <= 4 && !loading;

  const toggleComparison = (doc: string) => {
    setComparisons((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc],
    );
  };

  const onAnalyse = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await analyze(primary, comparisons);
      analysisStore.set(result);
      navigate({ to: "/matrix" });
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Backend unreachable on http://127.0.0.1:8000"
          : (e as Error).message,
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0f1623", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            Witness Statement Analysis
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Pleading-to-Proof
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section>
          <h2 className="text-lg font-semibold">Select statements</h2>
          <p className="mt-1 text-sm text-white/60">
            Choose one primary witness and 2–4 comparison witnesses. The
            analysis runs against the connected backend at{" "}
            <span className="text-white/80">http://127.0.0.1:8000</span>.
          </p>
        </section>

        {docError && (
          <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {docError}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
                Primary witness
              </h3>
              <span className="text-xs text-white/40">
                {docs ? `${docs.length} available` : "Loading…"}
              </span>
            </div>
            <select
              className="mt-4 w-full rounded-md border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              value={primary}
              onChange={(e) => {
                setPrimary(e.target.value);
                setComparisons((c) => c.filter((x) => x !== e.target.value));
              }}
              disabled={!docs || loading}
            >
              <option value="">Select a primary witness…</option>
              {(docs ?? []).map((d) => (
                <option key={d} value={d}>
                  {extractName(d)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
                Comparison witnesses
              </h3>
              <span className="text-xs text-white/40">
                {comparisons.length} selected (2–4 required)
              </span>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-white/10 divide-y divide-white/5">
              {filteredDocs.length === 0 && (
                <div className="px-3 py-6 text-sm text-white/50 text-center">
                  {primary ? "No other witnesses." : "Select a primary first."}
                </div>
              )}
              {filteredDocs.map((d) => {
                const checked = comparisons.includes(d);
                return (
                  <label
                    key={d}
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-white"
                      checked={checked}
                      disabled={loading}
                      onChange={() => toggleComparison(d)}
                    />
                    <span className="truncate text-white/90">
                      {extractName(d)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-10 flex items-center justify-end gap-3">
          <button
            onClick={onAnalyse}
            disabled={!canAnalyse}
            className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#0f1623] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90"
          >
            Analyse
          </button>
        </div>

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1623]/90 backdrop-blur-sm">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <p className="mt-6 text-base text-white">
                Analysing witness statements... this takes 2–3 minutes
              </p>
              <p className="mt-2 text-xs text-white/50">
                Keep this tab open.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
