import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { analyze, fetchDocuments } from "../lib/api";
import { analysisStore } from "../lib/analysis-store";
import { Magnetic } from "../components/Magnetic";
import { Reveal } from "../components/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pleading-to-Proof — Witness Statement Analysis" },
      {
        name: "description",
        content:
          "AI-powered witness statement evidence analysis for the Post Office Horizon IT Inquiry.",
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

function HeroScroller() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const skew = useTransform(scrollYProgress, [0, 1], [0, -6]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden noise"
    >
      <motion.div
        style={{ opacity }}
        className="absolute top-6 left-6 right-6 flex items-center justify-between text-xs font-type uppercase tracking-[0.25em] text-muted-foreground"
      >
        <span>Pleading → Proof</span>
        <span className="hidden md:block">Post Office Horizon IT Inquiry</span>
        <span>v.01 / 2026</span>
      </motion.div>

      <motion.h1
        style={{ scale, y, skewY: skew }}
        className="font-display text-[18vw] md:text-[14vw] leading-[0.85] text-center select-none"
      >
        <span className="block">PLEADING</span>
        <span className="block text-stroke">TO PROOF</span>
      </motion.h1>

      <motion.p
        style={{ opacity }}
        className="mt-10 max-w-xl text-center font-type text-sm md:text-base text-muted-foreground"
      >
        AI cross-examines witness statements, pins the evidence, and shows you
        exactly where the case is <span className="text-[#d4d4d4]">vulnerable</span>.
      </motion.p>

      <motion.div
        style={{ opacity }}
        className="absolute bottom-8 left-0 right-0 flex justify-center text-xs font-type uppercase tracking-[0.3em] text-muted-foreground"
      >
        <span className="animate-pulse">▼ scroll to begin</span>
      </motion.div>
    </section>
  );
}

function Marquee() {
  const items = [
    "Supporting", "Contradicting", "Evidential Gap",
    "Cross-Reference", "Trial Readiness", "Witness #1",
    "Witness #2", "Paragraph 42", "Confidence: HIGH",
  ];
  return (
    <div className="overflow-hidden border-y border-white/10 py-6 bg-black/30">
      <div className="marquee-track whitespace-nowrap font-display text-5xl md:text-7xl">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-12">
            <span className={i % 3 === 0 ? "text-[#e5e5e5]" : i % 3 === 1 ? "text-[#525252]" : "text-[#a3a3a3]"}>
              {t}
            </span>
            <span className="text-white/30">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function UploadPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<string[] | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [primary, setPrimary] = useState<string>("");
  const [comparisons, setComparisons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments()
      .then((r) => setDocs(r.documents))
      .catch((e) =>
        setDocError(
          e instanceof TypeError
            ? "Backend not running — check port 8000"
            : (e as Error).message,
        ),
      );
  }, []);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const filteredDocs = useMemo(
    () => (docs ?? []).filter((d) => d !== primary),
    [docs, primary],
  );

  const canAnalyse =
    primary && comparisons.length >= 2 && comparisons.length <= 4 && !loading;

  const toggleComparison = (doc: string) => {
    setComparisons((prev) => {
      if (prev.includes(doc)) return prev.filter((d) => d !== doc);
      if (prev.length >= 4) return prev;
      return [...prev, doc];
    });
  };

  const onAnalyse = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await analyze(primary, comparisons);
      analysisStore.set(result);
      navigate({ to: "/board" });
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Backend unreachable on port 8000."
          : (e as Error).message,
      );
      setLoading(false);
    }
  };

  if (loading) {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center">
          <div className="mx-auto h-20 w-20 rounded-full border-2 border-white/15 border-t-[#a3a3a3] animate-spin" />
          <h1 className="mt-8 font-display text-4xl tracking-tight">
            BUILDING THE BOARD
          </h1>
          <p className="mt-3 font-type text-muted-foreground">
            Claude is reading {comparisons.length + 1} statements. 2–3 minutes.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm tabular-nums font-type">
            <span className="h-2 w-2 rounded-full bg-[#a3a3a3] animate-pulse" />
            Elapsed {mins}:{secs.toString().padStart(2, "0")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroScroller />
      <Marquee />

      <main className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <div className="mb-16">
            <div className="font-type text-xs uppercase tracking-[0.3em] text-[#a3a3a3]">
              01 — Select the witnesses
            </div>
            <h2 className="mt-3 font-display text-6xl md:text-8xl leading-[0.9]">
              PIN THE<br/><span className="text-stroke">EVIDENCE</span>
            </h2>
            <p className="mt-6 max-w-xl font-type text-muted-foreground">
              Pick one primary witness. Pick 2–4 others to cross-examine. We extract every
              factual claim and check who supports it, who contradicts it, and where the
              corroboration is missing.
            </p>
          </div>
        </Reveal>

        {docError && (
          <div className="mb-6 rounded-md border border-[#525252]/40 bg-[#525252]/10 px-4 py-3 text-sm text-[#d4d4d4] font-type">
            {docError}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-card p-6 transition hover:border-[#a3a3a3]/40">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl tracking-tight text-foreground">Primary witness</h3>
                <span className="text-xs text-muted-foreground font-type">
                  {docs ? `${docs.length} available` : "Loading…"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground font-type">
                The witness whose claims will be tested against the others.
              </p>
              <select
                className="mt-4 w-full rounded-md border border-white/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3a3a3]"
                value={primary}
                onChange={(e) => {
                  setPrimary(e.target.value);
                  setComparisons((c) => c.filter((x) => x !== e.target.value));
                }}
                disabled={!docs}
              >
                <option value="">Select a primary witness…</option>
                {(docs ?? []).map((d) => (
                  <option key={d} value={d}>
                    {extractName(d)}
                  </option>
                ))}
              </select>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-lg border border-white/10 bg-card p-6 transition hover:border-[#e5e5e5]/40">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl tracking-tight text-foreground">Comparison witnesses</h3>
                <span className="text-xs text-muted-foreground font-type">
                  {comparisons.length} / 4 selected
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground font-type">
                Choose 2 to 4 witnesses to cross-reference.
              </p>
              <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-white/10 divide-y divide-white/5">
                {filteredDocs.length === 0 && (
                  <div className="px-3 py-6 text-sm text-muted-foreground text-center font-type">
                    {primary ? "No other witnesses." : "Select a primary first."}
                  </div>
                )}
                {filteredDocs.map((d) => {
                  const checked = comparisons.includes(d);
                  const disabled = !checked && comparisons.length >= 4;
                  return (
                    <label
                      key={d}
                      data-hover
                      className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 font-type transition ${
                        disabled ? "opacity-40" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#e5e5e5]"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleComparison(d)}
                      />
                      <span className="truncate">{extractName(d)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-[#525252]/40 bg-[#525252]/10 px-4 py-3 text-sm text-[#d4d4d4] font-type">
            {error}
          </div>
        )}

        <div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground font-type uppercase tracking-[0.2em]">
            Analysis ≈ 2–3 min. Keep this tab open.
          </p>
          <div className="flex items-center gap-3">
            {analysisStore.get() && (
              <Magnetic>
                <Link
                  to="/board"
                  data-hover
                  className="inline-block rounded-full border border-white/20 px-5 py-3 text-sm font-type uppercase tracking-[0.2em] hover:bg-white/5"
                >
                  Previous board →
                </Link>
              </Magnetic>
            )}
            <Magnetic strength={0.5}>
              <button
                onClick={onAnalyse}
                disabled={!canAnalyse}
                data-hover
                className="rounded-full bg-[#dc2626] px-8 py-4 text-sm font-type uppercase tracking-[0.25em] text-black disabled:opacity-30 hover:bg-[#ef4444] transition shadow-[0_10px_40px_-10px_rgba(220,38,38,.7)]"
              >
                Build the board →
              </button>
            </Magnetic>
          </div>
        </div>
      </main>
    </div>
  );
}
