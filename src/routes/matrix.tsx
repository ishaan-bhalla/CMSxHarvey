import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAnalysis, type MatrixRow } from "../lib/analysis-store";

export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Analysis — Witness Statement Matrix" },
      {
        name: "description",
        content:
          "Cross-referenced evidence matrix showing supporting, contradicting, and gap claims.",
      },
    ],
  }),
  component: MatrixPage,
});

function readinessStyle(r: string): { bg: string; label: string } {
  if (r === "STRONG") return { bg: "#22c55e", label: "STRONG" };
  if (r === "MODERATE") return { bg: "#f59e0b", label: "MODERATE" };
  return { bg: "#ef4444", label: "VULNERABLE" };
}

function rowBg(row: MatrixRow): string {
  if (row.contradicting.length > 0) return "rgba(239,68,68,0.10)";
  if (row.gap) return "rgba(245,158,11,0.10)";
  if (row.supporting.length > 0) return "rgba(34,197,94,0.10)";
  return "transparent";
}

function rowBorder(row: MatrixRow): string {
  if (row.contradicting.length > 0) return "#ef4444";
  if (row.gap) return "#f59e0b";
  if (row.supporting.length > 0) return "#22c55e";
  return "transparent";
}

function MatrixPage() {
  const result = useAnalysis();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!result) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 text-white"
        style={{ background: "#0f1623", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold">No analysis loaded</h1>
          <p className="mt-2 text-white/60">
            Run an analysis from the upload page first.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0f1623]"
          >
            Go to upload
          </button>
        </div>
      </div>
    );
  }

  const tr = readinessStyle(result.trial_readiness);

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0f1623", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-xs text-white/50 hover:text-white">
              ← New analysis
            </Link>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Pleading-to-Proof
            </h1>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <span className="rounded-md bg-white/10 px-3 py-1.5 font-medium">
              Analysis
            </span>
            <Link
              to="/report"
              className="rounded-md px-3 py-1.5 text-white/60 hover:text-white hover:bg-white/5"
            >
              Report
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Top summary */}
        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-wider text-white/50">
              Primary witness
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.primary_witness}
            </div>
            <div className="mt-1 text-xs text-white/50">
              vs {result.comparison_witnesses.join(", ")}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-wider text-white/50">
              Total claims
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {result.total_claims}
            </div>
            <div className="mt-1 text-xs text-white/50">
              {result.contradictions_count} contradicted · {result.gaps_count} gaps
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-wider text-white/50">
              Trial readiness
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                style={{ background: tr.bg }}
              >
                {tr.label}
              </span>
              <span className="text-sm text-white/70 tabular-nums">
                {result.trial_readiness_score.toFixed(1)}
              </span>
            </div>
          </div>
        </section>

        {/* Matrix table */}
        <section className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider text-white/50 border-b border-white/10 bg-white/[0.04]">
            <div className="col-span-5">Claim</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Topic</div>
            <div className="col-span-1 text-center">Supp.</div>
            <div className="col-span-1 text-center">Contr.</div>
            <div className="col-span-1 text-center">Gap</div>
          </div>

          <div className="divide-y divide-white/5">
            {result.matrix.map((row, i) => {
              const open = expanded === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setExpanded(open ? null : i)}
                    className="w-full text-left grid grid-cols-12 px-5 py-4 text-sm transition hover:bg-white/[0.04]"
                    style={{
                      background: rowBg(row),
                      borderLeft: `3px solid ${rowBorder(row)}`,
                    }}
                  >
                    <div className="col-span-5 pr-4">
                      <div className="line-clamp-2 text-white">
                        {row.allegation_summary}
                      </div>
                      <div className="mt-1 text-[11px] text-white/40">
                        {row.paragraph_ref}
                      </div>
                    </div>
                    <div className="col-span-2 text-white/60 capitalize">
                      {row.allegation_type}
                    </div>
                    <div className="col-span-2 text-white/60 capitalize">
                      {row.topic.replace(/_/g, " ")}
                    </div>
                    <div
                      className="col-span-1 text-center tabular-nums font-semibold"
                      style={{ color: row.supporting.length ? "#22c55e" : "#ffffff40" }}
                    >
                      {row.supporting.length || "—"}
                    </div>
                    <div
                      className="col-span-1 text-center tabular-nums font-semibold"
                      style={{ color: row.contradicting.length ? "#ef4444" : "#ffffff40" }}
                    >
                      {row.contradicting.length || "—"}
                    </div>
                    <div
                      className="col-span-1 text-center font-semibold"
                      style={{ color: row.gap ? "#f59e0b" : "#ffffff40" }}
                    >
                      {row.gap ? "●" : "—"}
                    </div>
                  </button>

                  {open && (
                    <div className="px-5 py-5 bg-white/[0.03] border-t border-white/10 space-y-5 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-white/50">
                          Full claim
                        </div>
                        <p className="mt-1 text-white">{row.allegation_summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/70">
                          <span className="rounded bg-white/10 px-2 py-0.5">
                            {row.allegation_type}
                          </span>
                          <span className="rounded bg-white/10 px-2 py-0.5 capitalize">
                            {row.topic.replace(/_/g, " ")}
                          </span>
                          <span className="rounded bg-white/10 px-2 py-0.5">
                            {row.paragraph_ref}
                          </span>
                          <span className="rounded bg-white/10 px-2 py-0.5">
                            confidence {row.confidence}
                          </span>
                        </div>
                      </div>

                      {row.supporting.length > 0 && (
                        <div>
                          <div
                            className="text-xs uppercase tracking-wider font-semibold"
                            style={{ color: "#22c55e" }}
                          >
                            Supporting ({row.supporting.length})
                          </div>
                          <div className="mt-2 space-y-2">
                            {row.supporting.map((s, idx) => (
                              <div
                                key={idx}
                                className="rounded border p-3"
                                style={{
                                  borderColor: "rgba(34,197,94,0.4)",
                                  background: "rgba(34,197,94,0.07)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium text-white">
                                    {s.witness}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-white/60">
                                    <span>{s.paragraph}</span>
                                    <span className="rounded bg-white/10 px-1.5 py-0.5">
                                      {s.confidence}
                                    </span>
                                  </div>
                                </div>
                                <blockquote className="mt-2 text-white/80 italic border-l-2 pl-3" style={{ borderColor: "#22c55e" }}>
                                  "{s.passage}"
                                </blockquote>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {row.contradicting.length > 0 && (
                        <div>
                          <div
                            className="text-xs uppercase tracking-wider font-semibold"
                            style={{ color: "#ef4444" }}
                          >
                            Contradicting ({row.contradicting.length})
                          </div>
                          <div className="mt-2 space-y-2">
                            {row.contradicting.map((c, idx) => (
                              <div
                                key={idx}
                                className="rounded border p-3"
                                style={{
                                  borderColor: "rgba(239,68,68,0.4)",
                                  background: "rgba(239,68,68,0.07)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium text-white">
                                    {c.witness}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-white/60">
                                    <span>{c.paragraph}</span>
                                    <span className="rounded bg-white/10 px-1.5 py-0.5">
                                      {c.confidence}
                                    </span>
                                  </div>
                                </div>
                                <blockquote className="mt-2 text-white/80 italic border-l-2 pl-3" style={{ borderColor: "#ef4444" }}>
                                  "{c.passage}"
                                </blockquote>
                                {c.reasoning && (
                                  <div className="mt-2 text-xs text-white/70">
                                    <span style={{ color: "#ef4444" }}>Reasoning:</span>{" "}
                                    {c.reasoning}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {row.neutral.length > 0 && (
                        <div className="text-xs text-white/60">
                          <span className="uppercase tracking-wider">Neutral:</span>{" "}
                          {row.neutral.join(", ")}
                          {row.not_addressed > 0 &&
                            ` · ${row.not_addressed} did not address`}
                        </div>
                      )}

                      {row.gap && (
                        <div
                          className="rounded border px-3 py-2 text-xs"
                          style={{
                            borderColor: "rgba(245,158,11,0.4)",
                            background: "rgba(245,158,11,0.10)",
                            color: "#f59e0b",
                          }}
                        >
                          Evidential gap — no corroboration found across comparison witnesses.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom totals */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-lg border p-5"
            style={{
              borderColor: "rgba(245,158,11,0.4)",
              background: "rgba(245,158,11,0.08)",
            }}
          >
            <div className="text-xs uppercase tracking-wider text-white/60">
              Evidential gaps
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "#f59e0b" }}>
              {result.gaps_count}
            </div>
          </div>
          <div
            className="rounded-lg border p-5"
            style={{
              borderColor: "rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.08)",
            }}
          >
            <div className="text-xs uppercase tracking-wider text-white/60">
              Contradictions
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "#ef4444" }}>
              {result.contradictions_count}
            </div>
          </div>
        </section>

        <div className="mt-8 flex justify-end">
          <Link
            to="/report"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0f1623] hover:bg-white/90"
          >
            View report →
          </Link>
        </div>
      </main>
    </div>
  );
}
