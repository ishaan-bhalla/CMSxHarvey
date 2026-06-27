import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalysis, type MatrixRow } from "../lib/analysis-store";
import { Magnetic } from "../components/Magnetic";

export const Route = createFileRoute("/board")({
  head: () => ({
    meta: [
      { title: "Evidence Board — Pleading-to-Proof" },
      {
        name: "description",
        content:
          "Conspiracy-board visualisation of witness testimony: pinned polaroids, sticky-note claims, and red-string contradictions.",
      },
    ],
  }),
  component: BoardPage,
});

/* ---------- helpers ---------- */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function hashRot(s: string, range = 6) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h % (range * 2)) - range);
}
function readinessTone(r: string) {
  if (r === "STRONG") return { bg: "#1e4d2b", fg: "#f5f5f5", word: "STRONG" };
  if (r === "MODERATE") return { bg: "#5a4014", fg: "#d4d4d4", word: "MODERATE" };
  return { bg: "#5a1414", fg: "#a3a3a3", word: "VULNERABLE" };
}
function noteTone(row: MatrixRow) {
  if (row.contradicting.length > 0) return "postit-red";
  if (row.gap) return "postit-yellow";
  return "postit-green";
}

/* ---------- main ---------- */
function BoardPage() {
  const result = useAnalysis();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "contradicting" | "gap" | "supporting">("all");
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => {
      if (boardRef.current) {
        const r = boardRef.current.getBoundingClientRect();
        setBoardSize({ w: r.width, h: r.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-4xl">NO BOARD YET</h1>
          <p className="mt-2 text-muted-foreground font-type">
            Run an analysis to assemble the evidence board.
          </p>
          <Magnetic>
            <button
              onClick={() => navigate({ to: "/" })}
              data-hover
              className="mt-6 rounded-full bg-[#dc2626] px-6 py-3 text-sm font-type uppercase tracking-[0.2em] text-black hover:bg-[#ef4444] transition"
            >
              Start analysis
            </button>
          </Magnetic>
        </div>
      </div>
    );
  }

  // Witnesses to pin: primary + comparisons
  const allWitnesses = useMemo(
    () => [result.primary_witness, ...result.comparison_witnesses],
    [result],
  );

  // Lay out witness polaroids in a top row, and claim notes in a grid below
  const witnessSlots = useMemo(() => {
    const n = allWitnesses.length;
    const w = Math.max(boardSize.w, 1200);
    return allWitnesses.map((name, i) => {
      const x = (w / (n + 1)) * (i + 1);
      const y = 140;
      return { name, x, y, rot: hashRot(name + i, 5) };
    });
  }, [allWitnesses, boardSize]);

  // Build claim cards
  const visibleRows = useMemo(() => {
    return result.matrix
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => {
        if (filter === "all") return true;
        if (filter === "contradicting") return row.contradicting.length > 0;
        if (filter === "gap") return row.gap;
        if (filter === "supporting") return row.supporting.length > 0 && row.contradicting.length === 0 && !row.gap;
        return true;
      });
  }, [result, filter]);

  const noteSlots = useMemo(() => {
    const cols = boardSize.w > 1600 ? 5 : boardSize.w > 1200 ? 4 : 3;
    const colW = Math.max(boardSize.w, 1200) / cols;
    const startY = 460;
    return visibleRows.map(({ row, idx }, i) => {
      const col = i % cols;
      const rowI = Math.floor(i / cols);
      const x = colW * col + colW / 2;
      const y = startY + rowI * 260;
      return { row, idx, x, y, rot: hashRot(row.allegation_summary + idx, 4) };
    });
  }, [visibleRows, boardSize]);

  // Strings: connect each contradicted claim to its primary witness AND to contradicting witnesses
  const strings = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string; color: string }> = [];
    const witnessMap = new Map(witnessSlots.map((w) => [w.name, w]));
    noteSlots.forEach(({ row, idx, x, y }) => {
      if (row.contradicting.length === 0) return;
      const primary = witnessMap.get(result.primary_witness);
      if (primary) {
        lines.push({
          x1: primary.x, y1: primary.y + 120,
          x2: x, y2: y - 10,
          key: `p-${idx}`, color: "#404040",
        });
      }
      row.contradicting.forEach((c, ci) => {
        const w = witnessMap.get(c.witness);
        if (!w) return;
        lines.push({
          x1: w.x, y1: w.y + 120,
          x2: x, y2: y - 10,
          key: `c-${idx}-${ci}`, color: "#404040",
        });
      });
    });
    return lines;
  }, [noteSlots, witnessSlots, result]);

  const tone = readinessTone(result.trial_readiness);
  const boardW = Math.max(boardSize.w, 1200);
  const boardH = Math.max(600, 460 + Math.ceil(noteSlots.length / (boardSize.w > 1600 ? 5 : boardSize.w > 1200 ? 4 : 3)) * 260 + 120);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" data-hover className="font-display text-xl tracking-tight hover:text-[#a3a3a3]">
              ← P/P
            </Link>
            <div>
              <div className="font-type text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Case Board
              </div>
              <div className="font-marker text-lg leading-none mt-1">
                {result.primary_witness}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-type">
            <span
              className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {tone.word} · {(result.trial_readiness_score * 100).toFixed(0)}%
            </span>
            <Link to="/matrix" data-hover className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-black hover:bg-black/5">
              Matrix
            </Link>
            <Link to="/report" data-hover className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-black hover:bg-black/5">
              Report
            </Link>
          </div>
        </div>
        {/* Filters */}
        <div className="mx-auto max-w-7xl px-6 pb-3 flex items-center gap-2 text-xs font-type uppercase tracking-[0.2em]">
          {([
            ["all", "All", "#000000"],
            ["contradicting", `Contradictions (${result.contradictions_count})`, "#525252"],
            ["gap", `Gaps (${result.gaps_count})`, "#737373"],
            ["supporting", "Supported", "#262626"],
          ] as const).map(([k, label, color]) => (
            <button
              key={k}
              data-hover
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 transition ${
                filter === k ? "bg-black text-white border-black" : "border-black/15 text-muted-foreground hover:text-black"
              }`}
              style={filter === k ? {} : { color }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Corkboard */}
      <div
        ref={boardRef}
        className="corkboard relative overflow-x-auto overflow-y-hidden"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        <div className="relative" style={{ width: boardW, height: boardH }}>
          {/* Red strings */}
          <svg className="absolute inset-0 pointer-events-none" width={boardW} height={boardH}>
            {strings.map((s) => {
              const dx = s.x2 - s.x1;
              const dy = s.y2 - s.y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const sag = Math.min(40, len * 0.08);
              const mx = (s.x1 + s.x2) / 2;
              const my = (s.y1 + s.y2) / 2 + sag;
              return (
                <path
                  key={s.key}
                  d={`M ${s.x1} ${s.y1} Q ${mx} ${my} ${s.x2} ${s.y2}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.8}
                  strokeOpacity={0.85}
                  className="red-string"
                />
              );
            })}
          </svg>

          {/* Header banner */}
          <div className="absolute left-1/2 -translate-x-1/2 top-6 z-10 paper px-8 py-3 rotate-[-1.2deg] font-display text-3xl tracking-wide">
            CASE FILE · {result.primary_witness.toUpperCase()}
          </div>

          {/* Witness polaroids */}
          {witnessSlots.map((w, i) => {
            const isPrimary = w.name === result.primary_witness;
            return (
              <div
                key={w.name}
                className="absolute polaroid wobble"
                style={{
                  left: w.x - 110,
                  top: w.y,
                  width: 220,
                  ["--rot" as any]: `${w.rot}deg`,
                  transform: `rotate(${w.rot}deg)`,
                }}
              >
                <div className={`pushpin absolute -top-2 left-1/2 -translate-x-1/2 ${isPrimary ? "" : "amber"}`} />
                <div
                  className="aspect-square w-full flex items-center justify-center font-display text-6xl"
                  style={{
                    background: `linear-gradient(135deg, #2a2a2a, #4a4a4a)`,
                    color: "#ddd",
                    filter: "grayscale(0.4) contrast(1.05)",
                  }}
                >
                  {initialsOf(w.name)}
                </div>
                <div className="mt-3 text-center">
                  <div className="font-marker text-lg leading-tight">{w.name}</div>
                  <div className="font-type text-[10px] uppercase tracking-[0.2em] text-neutral-600 mt-1">
                    {isPrimary ? "Primary witness" : "Comparison"}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Claim notes */}
          {noteSlots.map(({ row, idx, x, y, rot }) => {
            const tone = noteTone(row);
            return (
              <button
                key={idx}
                data-hover
                onClick={() => setSelected(idx)}
                className={`absolute ${tone} wobble text-left p-4 w-[240px] min-h-[180px] hover:scale-[1.05] transition`}
                style={{
                  left: x - 120,
                  top: y,
                  ["--rot" as any]: `${rot}deg`,
                  transform: `rotate(${rot}deg)`,
                  boxShadow: "0 14px 24px rgba(0,0,0,.45), 0 3px 6px rgba(0,0,0,.3)",
                  cursor: "none",
                }}
              >
                <div className="pushpin absolute -top-2 left-1/2 -translate-x-1/2" />
                <div className="font-type text-[9px] uppercase tracking-[0.2em] opacity-70">
                  {row.topic.replace(/_/g, " ")} · {row.paragraph_ref}
                </div>
                <div className="font-hand text-[20px] leading-[1.15] mt-2 line-clamp-5">
                  {row.allegation_summary}
                </div>
                <div className="absolute bottom-2 right-3 font-type text-[10px] opacity-70 flex gap-2">
                  {row.supporting.length > 0 && <span>✓ {row.supporting.length}</span>}
                  {row.contradicting.length > 0 && <span>✗ {row.contradicting.length}</span>}
                  {row.gap && <span>⚠ gap</span>}
                </div>
              </button>
            );
          })}

          {/* Legend */}
          <div className="absolute right-6 top-6 paper px-4 py-3 rotate-[2deg] font-type text-xs">
            <div className="font-marker text-base mb-2">LEGEND</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 inline-block postit-green" /> supported</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 inline-block postit-yellow" /> evidential gap</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 inline-block postit-red" /> contradicted</div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10">
              <span className="inline-block w-6 h-[2px]" style={{ background: "#404040" }} /> red string = contradiction
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selected !== null && result.matrix[selected] && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="paper max-w-3xl w-full max-h-[85vh] overflow-y-auto p-8 relative"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: "rotate(-0.5deg)" }}
          >
            <div className="pushpin absolute -top-2 left-12" />
            <button
              onClick={() => setSelected(null)}
              data-hover
              className="absolute top-4 right-5 font-display text-3xl text-black/50 hover:text-black"
            >
              ×
            </button>
            <ClaimDetail row={result.matrix[selected]} />
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimDetail({ row }: { row: MatrixRow }) {
  return (
    <div>
      <div className="font-type text-[10px] uppercase tracking-[0.3em] text-black/60">
        {row.topic.replace(/_/g, " ")} · {row.paragraph_ref} · confidence {row.confidence}
      </div>
      <h2 className="mt-3 font-marker text-3xl leading-tight text-black">
        {row.allegation_summary}
      </h2>

      {row.supporting.length > 0 && (
        <section className="mt-6">
          <h3 className="font-display text-xl text-[#1e4d2b]">SUPPORTING · {row.supporting.length}</h3>
          <div className="mt-2 space-y-3">
            {row.supporting.map((s, i) => (
              <div key={i} className="border-l-4 border-[#e5e5e5] pl-4">
                <div className="font-marker text-lg text-black">{s.witness}</div>
                <blockquote className="font-hand text-lg text-black/80 italic">"{s.passage}"</blockquote>
                <div className="font-type text-[10px] uppercase tracking-[0.2em] text-black/60 mt-1">
                  {s.paragraph} · {s.confidence}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {row.contradicting.length > 0 && (
        <section className="mt-6">
          <h3 className="font-display text-xl text-[#7a1212]">CONTRADICTING · {row.contradicting.length}</h3>
          <div className="mt-2 space-y-3">
            {row.contradicting.map((c, i) => (
              <div key={i} className="border-l-4 border-[#404040] pl-4">
                <div className="font-marker text-lg text-black">{c.witness}</div>
                <blockquote className="font-hand text-lg text-black/80 italic">"{c.passage}"</blockquote>
                <div className="font-type text-[10px] uppercase tracking-[0.2em] text-black/60 mt-1">
                  {c.paragraph} · {c.confidence}
                </div>
                {c.reasoning && (
                  <div className="font-type text-xs text-black/70 mt-2">
                    <span className="text-[#7a1212] font-semibold">REASONING:</span> {c.reasoning}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {row.gap && row.contradicting.length === 0 && (
        <div className="mt-6 postit-yellow p-4 font-hand text-xl">
          ⚠ No corroboration found across comparison witnesses. This is an evidential gap.
        </div>
      )}

      {row.neutral.length > 0 && (
        <div className="mt-4 font-type text-xs text-black/60 uppercase tracking-[0.2em]">
          Neutral: {row.neutral.join(", ")}
          {row.not_addressed > 0 && ` · ${row.not_addressed} did not address`}
        </div>
      )}
    </div>
  );
}
