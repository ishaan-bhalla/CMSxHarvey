import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAnalysis, type MatrixRow } from "../lib/analysis-store";

export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Evidence Matrix — Pleading-to-Proof" },
      {
        name: "description",
        content:
          "Cross-referenced evidence matrix showing supporting, contradicting, and gap claims across witness statements.",
      },
    ],
  }),
  component: MatrixPage,
});

function readinessClass(r: string) {
  if (r === "STRONG") return "bg-[#e5e5e5]/15 text-[#f5f5f5] border-[#e5e5e5]/40";
  if (r === "MODERATE") return "bg-[#a3a3a3]/15 text-[#d4d4d4] border-[#a3a3a3]/40";
  return "bg-[#525252]/15 text-[#a3a3a3] border-[#525252]/40";
}

function confidencePill(c: string) {
  const base =
    "inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider";
  if (c === "HIGH") return `${base} bg-black/10 text-black`;
  if (c === "MEDIUM") return `${base} bg-black/5 text-muted-foreground`;
  return `${base} bg-black/5 text-muted-foreground`;
}

function rowTone(row: MatrixRow) {
  if (row.contradicting.length > 0)
    return "bg-[#525252]/10 hover:bg-[#525252]/15 border-l-2 border-[#525252]";
  if (row.gap) return "bg-[#a3a3a3]/10 hover:bg-[#a3a3a3]/15 border-l-2 border-[#a3a3a3]";
  if (row.supporting.length > 0)
    return "bg-[#e5e5e5]/10 hover:bg-[#e5e5e5]/15 border-l-2 border-[#e5e5e5]";
  return "hover:bg-black/5 border-l-2 border-transparent";
}

function MatrixPage() {
  const result = useAnalysis();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold">No analysis loaded</h1>
          <p className="mt-2 text-muted-foreground">
            Run an analysis from the home page to populate the matrix.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-[color:var(--color-primary-foreground)]"
          >
            Start analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-black">
              ← New analysis
            </Link>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Pleading-to-Proof
            </h1>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/board"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-black hover:bg-black/5"
            >
              Board
            </Link>
            <span className="rounded-md bg-black/10 px-3 py-1.5 font-medium">
              Matrix
            </span>
            <Link
              to="/report"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-black hover:bg-black/5"
            >
              Report
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-lg border border-black/10 bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Primary witness
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.primary_witness}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              vs {result.comparison_witnesses.join(", ")}
            </div>
          </div>
          <div className="rounded-lg border border-black/10 bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total claims
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {result.total_claims}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {result.contradictions_count} contradicted · {result.gaps_count} gaps
            </div>
          </div>
          <div className="rounded-lg border border-black/10 bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Trial readiness
            </div>
            <div
              className={`mt-2 inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-semibold ${readinessClass(result.trial_readiness)}`}
            >
              {result.trial_readiness}
            </div>
            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
              Score {(result.trial_readiness_score * 100).toFixed(0)}%
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-black/10 bg-black/5">
            <div className="col-span-5">Claim</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Topic</div>
            <div className="col-span-1 text-center">Supp.</div>
            <div className="col-span-1 text-center">Contr.</div>
            <div className="col-span-1 text-center">Gap</div>
          </div>

          <div className="divide-y divide-black/5">
            {result.matrix.map((row, i) => {
              const open = expanded === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setExpanded(open ? null : i)}
                    className={`w-full text-left grid grid-cols-12 px-5 py-4 text-sm transition ${rowTone(row)}`}
                  >
                    <div className="col-span-5 pr-4">
                      <div className="line-clamp-2 text-black">
                        {row.allegation_summary}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {row.paragraph_ref}
                      </div>
                    </div>
                    <div className="col-span-2 text-muted-foreground capitalize">
                      {row.allegation_type}
                    </div>
                    <div className="col-span-2 text-muted-foreground capitalize">
                      {row.topic.replace(/_/g, " ")}
                    </div>
                    <div className="col-span-1 text-center tabular-nums text-[#f5f5f5]">
                      {row.supporting.length || "—"}
                    </div>
                    <div className="col-span-1 text-center tabular-nums text-[#a3a3a3]">
                      {row.contradicting.length || "—"}
                    </div>
                    <div className="col-span-1 text-center text-[#d4d4d4]">
                      {row.gap ? "●" : "—"}
                    </div>
                  </button>

                  {open && (
                    <div className="px-5 py-5 bg-white/30 border-t border-black/10 space-y-5 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          Full claim
                        </div>
                        <p className="mt-1 text-black">{row.allegation_summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded bg-black/10 px-2 py-0.5">
                            {row.allegation_type}
                          </span>
                          <span className="rounded bg-black/10 px-2 py-0.5 capitalize">
                            {row.topic.replace(/_/g, " ")}
                          </span>
                          <span className="rounded bg-black/10 px-2 py-0.5">
                            {row.paragraph_ref}
                          </span>
                          <span className={confidencePill(row.confidence)}>
                            {row.confidence}
                          </span>
                        </div>
                      </div>

                      {row.supporting.length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#f5f5f5]">
                            Supporting evidence ({row.supporting.length})
                          </div>
                          <div className="mt-2 space-y-2">
                            {row.supporting.map((s, idx) => (
                              <div
                                key={idx}
                                className="rounded border border-[#e5e5e5]/30 bg-[#e5e5e5]/5 p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium">{s.witness}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span>{s.paragraph}</span>
                                    <span className={confidencePill(s.confidence)}>
                                      {s.confidence}
                                    </span>
                                  </div>
                                </div>
                                <blockquote className="mt-2 text-muted-foreground italic border-l-2 border-[#e5e5e5]/50 pl-3">
                                  "{s.passage}"
                                </blockquote>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {row.contradicting.length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#a3a3a3]">
                            Contradicting evidence ({row.contradicting.length})
                          </div>
                          <div className="mt-2 space-y-2">
                            {row.contradicting.map((c, idx) => (
                              <div
                                key={idx}
                                className="rounded border border-[#525252]/30 bg-[#525252]/5 p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium">{c.witness}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span>{c.paragraph}</span>
                                    <span className={confidencePill(c.confidence)}>
                                      {c.confidence}
                                    </span>
                                  </div>
                                </div>
                                <blockquote className="mt-2 text-muted-foreground italic border-l-2 border-[#525252]/50 pl-3">
                                  "{c.passage}"
                                </blockquote>
                                {c.reasoning && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <span className="text-[#a3a3a3]">Reasoning:</span>{" "}
                                    {c.reasoning}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {row.neutral.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="uppercase tracking-wider">Neutral:</span>{" "}
                          {row.neutral.join(", ")}
                          {row.not_addressed > 0 &&
                            ` · ${row.not_addressed} did not address`}
                        </div>
                      )}

                      {row.gap && (
                        <div className="rounded border border-[#a3a3a3]/40 bg-[#a3a3a3]/10 px-3 py-2 text-xs text-[#d4d4d4]">
                          ⚠ Evidential gap — no corroboration found across
                          comparison witnesses.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
