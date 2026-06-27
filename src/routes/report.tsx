import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAnalysis } from "../lib/analysis-store";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report — Gaps & Contradictions" },
      {
        name: "description",
        content:
          "Evidential gaps and contradictions summary across witness statements.",
      },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const result = useAnalysis();
  const navigate = useNavigate();

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

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0f1623", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-xs text-white/50 hover:text-white">
              ← New analysis
            </Link>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Pleading-to-Proof
            </h1>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/matrix"
              className="rounded-md px-3 py-1.5 text-white/60 hover:text-white hover:bg-white/5"
            >
              Analysis
            </Link>
            <span className="rounded-md bg-white/10 px-3 py-1.5 font-medium">
              Report
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        {/* Gaps */}
        <section>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              Evidential Gaps
              <span
                className="ml-3 text-sm font-normal"
                style={{ color: "#f59e0b" }}
              >
                {result.gaps_count} found
              </span>
            </h2>
            <p className="text-xs text-white/50 max-w-md">
              Claims with no corroboration across comparison witnesses.
            </p>
          </div>

          {result.gaps.length === 0 ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">
              No evidential gaps identified.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.gaps.map((g, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: "rgba(245,158,11,0.4)",
                    background: "rgba(245,158,11,0.08)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className="rounded px-2 py-0.5 uppercase tracking-wider font-semibold"
                      style={{
                        background: "rgba(245,158,11,0.2)",
                        color: "#f59e0b",
                      }}
                    >
                      {g.topic.replace(/_/g, " ")}
                    </span>
                    <span className="text-white/50">{g.paragraph_ref}</span>
                  </div>
                  <p className="mt-3 text-sm text-white">
                    {g.allegation_summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contradictions */}
        <section>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              Contradictions
              <span
                className="ml-3 text-sm font-normal"
                style={{ color: "#ef4444" }}
              >
                {result.contradictions_count} found
              </span>
            </h2>
            <p className="text-xs text-white/50 max-w-md">
              Witnesses disagree — these need resolution before trial.
            </p>
          </div>

          {result.contradictions.length === 0 ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">
              No contradictions identified.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {result.contradictions.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-5"
                  style={{
                    borderColor: "rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="rounded px-2 py-0.5 uppercase tracking-wider font-semibold"
                      style={{
                        background: "rgba(239,68,68,0.2)",
                        color: "#ef4444",
                      }}
                    >
                      {c.topic.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white font-medium">
                    {c.allegation_summary}
                  </p>
                  <div className="mt-4 space-y-2">
                    {c.contradicting.map((x, idx) => (
                      <div
                        key={idx}
                        className="rounded border p-3 text-sm"
                        style={{
                          borderColor: "rgba(239,68,68,0.3)",
                          background: "rgba(0,0,0,0.25)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-white">
                            {x.witness}
                          </span>
                          <span className="text-white/50">
                            {x.paragraph} · {x.confidence}
                          </span>
                        </div>
                        <blockquote
                          className="mt-2 italic text-white/80 border-l-2 pl-3"
                          style={{ borderColor: "#ef4444" }}
                        >
                          "{x.passage}"
                        </blockquote>
                        {x.reasoning && (
                          <div className="mt-2 text-xs text-white/60">
                            <span style={{ color: "#ef4444" }}>Reasoning:</span>{" "}
                            {x.reasoning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/10">
          <Link
            to="/matrix"
            className="rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
          >
            ← Back to Analysis
          </Link>
          <Link
            to="/"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0f1623] hover:bg-white/90"
          >
            New analysis
          </Link>
        </div>
      </main>
    </div>
  );
}
