import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Mail,
  FileText,
  Receipt,
  Users,
  AlertTriangle,
  ShieldCheck,
  FileSearch,
  Scale,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/evidence-matrix")({
  head: () => ({
    meta: [
      { title: "Evidence Matrix — Trial Prep" },
      {
        name: "description",
        content:
          "Litigation evidence-analysis dashboard ranking claims by documentary corroboration and witness support.",
      },
    ],
  }),
  component: EvidenceMatrixPage,
});

type Confidence = "HIGH" | "MEDIUM" | "LOW";
type DocType = "email" | "contract" | "invoice" | "minutes";

type WitnessEvidence = {
  witness: string;
  passage: string;
  paragraph: string;
  confidence: Confidence;
  reasoning?: string;
};

type DocEvidence = {
  exhibit: string;
  doc_type: DocType;
  date: string;
  passage: string;
  location: string;
  confidence: Confidence;
};

type Claim = {
  allegation_summary: string;
  allegation_type: string;
  topic: string;
  paragraph_ref: string;
  witness_a: string;
  confidence: Confidence;
  gap: boolean;
  supporting: WitnessEvidence[];
  contradicting: WitnessEvidence[];
  neutral: string[];
  not_addressed: number;
  documents_supporting: DocEvidence[];
  documents_contradicting: DocEvidence[];
};

type Data = {
  primary_witness: string;
  comparison_witnesses: string[];
  total_claims: number;
  trial_readiness: "STRONG" | "MODERATE" | "VULNERABLE";
  trial_readiness_score: number;
  documentary_corroboration_score: number;
  matrix: Claim[];
};

const DATA: Data = {
  primary_witness: "Jane Smith",
  comparison_witnesses: ["Robert Jones", "Aisha Khan"],
  total_claims: 3,
  trial_readiness: "MODERATE",
  trial_readiness_score: 66.7,
  documentary_corroboration_score: 33.3,
  matrix: [
    {
      allegation_summary: "The parties agreed a £50,000 fee on the call.",
      allegation_type: "allegation",
      topic: "financial_losses",
      paragraph_ref: "para 4",
      witness_a: "Jane Smith",
      confidence: "HIGH",
      gap: false,
      supporting: [
        {
          witness: "Robert Jones",
          passage: "I recall a £50k figure being discussed.",
          paragraph: "para 7",
          confidence: "MEDIUM",
        },
      ],
      contradicting: [],
      neutral: ["Aisha Khan"],
      not_addressed: 0,
      documents_supporting: [
        {
          exhibit: "JS-3",
          doc_type: "email",
          date: "2021-03-12",
          passage: "Happy to proceed at £50,000 as discussed.",
          location: "body",
          confidence: "HIGH",
        },
      ],
      documents_contradicting: [],
    },
    {
      allegation_summary: "Delivery was promised by 1 June.",
      allegation_type: "allegation",
      topic: "other",
      paragraph_ref: "para 9",
      witness_a: "Jane Smith",
      confidence: "LOW",
      gap: false,
      supporting: [],
      contradicting: [
        {
          witness: "Aisha Khan",
          passage: "No firm date was ever set.",
          paragraph: "para 12",
          confidence: "HIGH",
          reasoning: "Directly denies a fixed deadline.",
        },
      ],
      neutral: [],
      not_addressed: 1,
      documents_supporting: [],
      documents_contradicting: [
        {
          exhibit: "AK-2",
          doc_type: "contract",
          date: "2021-02-01",
          passage: "Delivery date to be agreed in writing.",
          location: "clause 5.2",
          confidence: "HIGH",
        },
      ],
    },
    {
      allegation_summary: "The witness raised concerns internally in 2009.",
      allegation_type: "admission",
      topic: "knowledge",
      paragraph_ref: "para 15",
      witness_a: "Jane Smith",
      confidence: "LOW",
      gap: true,
      supporting: [],
      contradicting: [],
      neutral: [],
      not_addressed: 2,
      documents_supporting: [],
      documents_contradicting: [],
    },
  ],
};

const docIcon = (t: DocType) =>
  t === "email" ? Mail : t === "contract" ? FileText : t === "invoice" ? Receipt : Users;

function readinessTone(r: string) {
  if (r === "STRONG") return { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/30", dot: "bg-emerald-600" };
  if (r === "MODERATE") return { bg: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-600/30", dot: "bg-amber-500" };
  return { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-600/30", dot: "bg-rose-600" };
}

function confTone(c: Confidence) {
  if (c === "HIGH") return "bg-slate-900 text-white";
  if (c === "MEDIUM") return "bg-slate-300 text-slate-900";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function rankClaim(c: Claim) {
  const docSupport = c.documents_supporting.length;
  const docContra = c.documents_contradicting.length;
  const docs = docSupport + docContra;
  const witnesses = c.supporting.length + c.contradicting.length;
  const conf = c.confidence === "HIGH" ? 3 : c.confidence === "MEDIUM" ? 2 : 1;
  // higher = better/stronger evidence base
  return docs * 100 + witnesses * 10 + conf + (c.gap ? -1000 : 0);
}

function EvidenceMatrixPage() {
  const [filter, setFilter] = useState<"all" | "doc_backed" | "contradicted" | "gaps">("all");
  const [sort, setSort] = useState<"default" | "confidence">("default");

  const claims = useMemo(() => {
    let rows = DATA.matrix.slice();
    if (filter === "doc_backed") rows = rows.filter((r) => r.documents_supporting.length > 0);
    if (filter === "contradicted")
      rows = rows.filter((r) => r.contradicting.length > 0 || r.documents_contradicting.length > 0);
    if (filter === "gaps") rows = rows.filter((r) => r.gap);

    if (sort === "confidence") {
      const w = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
      rows.sort((a, b) => w[b.confidence] - w[a.confidence]);
    } else {
      rows.sort((a, b) => rankClaim(b) - rankClaim(a));
    }
    return rows;
  }, [filter, sort]);

  const tr = readinessTone(DATA.trial_readiness);
  const docTone =
    DATA.documentary_corroboration_score >= 66
      ? readinessTone("STRONG")
      : DATA.documentary_corroboration_score >= 33
      ? readinessTone("MODERATE")
      : readinessTone("VULNERABLE");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-900">
                ← Back
              </Link>
              <div className="mt-2 flex items-center gap-3">
                <Scale className="h-6 w-6 text-slate-700" />
                <h1
                  className="text-3xl font-semibold tracking-tight text-slate-900"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Evidence Matrix
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Smith v. Jones &amp; Khan · Trial preparation analysis
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    Primary witness
                  </div>
                  <div className="mt-0.5 font-semibold text-slate-900">
                    {DATA.primary_witness}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-2" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    Compared against
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {DATA.comparison_witnesses.map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                      >
                        <Users className="h-3 w-3" />
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-[520px]">
              <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm`}>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  Trial Readiness
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <div className="text-4xl font-semibold tabular-nums text-slate-900">
                    {DATA.trial_readiness_score.toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-400">/ 100</div>
                </div>
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${tr.bg} ${tr.text} ${tr.ring}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${tr.dot}`} />
                  {DATA.trial_readiness}
                </div>
              </div>

              <div className="group relative rounded-xl border-2 border-slate-900 bg-white p-5 shadow-md">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-700 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Documentary Corroboration
                  <span className="relative">
                    <Info className="h-3 w-3 text-slate-400" />
                    <span className="pointer-events-none absolute left-1/2 top-5 z-10 hidden w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-white shadow-lg group-hover:block">
                      Document-backed claims are the strongest evidence at trial.
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <div className="text-4xl font-semibold tabular-nums text-slate-900">
                    {DATA.documentary_corroboration_score.toFixed(1)}%
                  </div>
                </div>
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${docTone.bg} ${docTone.text} ${docTone.ring}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${docTone.dot}`} />
                  {DATA.documentary_corroboration_score >= 66
                    ? "STRONG"
                    : DATA.documentary_corroboration_score >= 33
                    ? "MODERATE"
                    : "VULNERABLE"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All claims"],
                ["doc_backed", "Document-backed"],
                ["contradicted", "Contradicted"],
                ["gaps", "Evidence gaps"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  filter === k
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="default">Document-backed, then confidence</option>
              <option value="confidence">Confidence (high → low)</option>
            </select>
          </div>
        </div>

        {/* Claims */}
        <div className="space-y-5">
          {claims.map((c, i) => (
            <ClaimCard key={i} claim={c} />
          ))}
          {claims.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No claims match the current filter.
            </div>
          )}
        </div>

        {/* Legend */}
        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Legend
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border-2 border-slate-900 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <ShieldCheck className="h-3 w-3" /> Doc-backed
              </span>
              <span>Claim corroborated by a contemporaneous document — strongest evidence.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-3 w-3 rounded-sm bg-emerald-600 ring-1 ring-emerald-700" />
              <span>Green = supporting evidence (document or witness).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-3 w-3 rounded-sm bg-rose-600 ring-1 ring-rose-700" />
              <span>Red = contradicting evidence (document or witness).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-3 w-3 rounded-sm bg-slate-400 ring-1 ring-slate-500" />
              <span>Grey = evidence gap; no corroboration of any kind.</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Documentary evidence is rendered with bolder borders and ranked above
            witness recollection because contemporaneous documents carry more
            weight at trial than later witness memory.
          </p>
        </section>
      </main>
    </div>
  );
}

function ClaimCard({ claim }: { claim: Claim }) {
  const hasDocSupport = claim.documents_supporting.length > 0;
  const hasDocContra = claim.documents_contradicting.length > 0;
  const hasAnyDoc = hasDocSupport || hasDocContra;

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
        claim.gap
          ? "border-slate-300"
          : hasDocSupport
          ? "border-slate-900/80 ring-1 ring-slate-900/10"
          : "border-slate-200"
      }`}
    >
      {/* Claim header */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {hasDocSupport && (
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-slate-900 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  <ShieldCheck className="h-3 w-3" />
                  Document-backed
                </span>
              )}
              {claim.gap && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  <AlertTriangle className="h-3 w-3" />
                  Evidence gap
                </span>
              )}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${confTone(claim.confidence)}`}>
                {claim.confidence}
              </span>
            </div>
            <h2
              className="mt-2 text-lg font-semibold leading-snug text-slate-900"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              "{claim.allegation_summary}"
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <Chip>{claim.allegation_type}</Chip>
              <Chip>{claim.topic.replace(/_/g, " ")}</Chip>
              <Chip>{claim.paragraph_ref}</Chip>
              <Chip muted>by {claim.witness_a}</Chip>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence body */}
      {claim.gap ? (
        <div className="flex items-center gap-3 bg-slate-50 px-5 py-6 text-sm text-slate-600">
          <AlertTriangle className="h-5 w-5 text-slate-500" />
          <div>
            <div className="font-semibold text-slate-800">No corroborating evidence found.</div>
            <div className="text-xs text-slate-500">
              {claim.not_addressed} witness{claim.not_addressed === 1 ? "" : "es"} did not address this claim.
              No supporting documents on file.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-5">
          {/* Documentary - prominent */}
          <div className="lg:col-span-3 border-b border-slate-100 lg:border-b-0 lg:border-r-2 lg:border-slate-900/10 bg-slate-50/60 px-5 py-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Documentary Evidence
              </h3>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Primary
              </span>
            </div>
            {hasAnyDoc ? (
              <div className="space-y-2.5">
                {claim.documents_supporting.map((d, i) => (
                  <DocCard key={`s${i}`} doc={d} kind="support" />
                ))}
                {claim.documents_contradicting.map((d, i) => (
                  <DocCard key={`c${i}`} doc={d} kind="contradict" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-xs text-slate-500">
                No documentary evidence on file for this claim.
              </div>
            )}
          </div>

          {/* Witness - de-emphasised */}
          <div className="lg:col-span-2 px-5 py-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Witness Evidence
              </h3>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Secondary
              </span>
            </div>
            <div className="space-y-2">
              {claim.supporting.map((w, i) => (
                <WitnessCard key={`s${i}`} w={w} kind="support" />
              ))}
              {claim.contradicting.map((w, i) => (
                <WitnessCard key={`c${i}`} w={w} kind="contradict" />
              ))}
              {claim.supporting.length === 0 && claim.contradicting.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-[11px] text-slate-400">
                  No witness corroboration or contradiction.
                </div>
              )}
              {(claim.neutral.length > 0 || claim.not_addressed > 0) && (
                <div className="pt-1 text-[11px] text-slate-400">
                  {claim.neutral.length > 0 && (
                    <span>Neutral: {claim.neutral.join(", ")}. </span>
                  )}
                  {claim.not_addressed > 0 && (
                    <span>{claim.not_addressed} did not address.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Chip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 capitalize ${
        muted ? "bg-transparent text-slate-400" : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

function DocCard({ doc, kind }: { doc: DocEvidence; kind: "support" | "contradict" }) {
  const Icon = docIcon(doc.doc_type);
  const isSupport = kind === "support";
  return (
    <div
      className={`rounded-lg border-2 bg-white p-3.5 shadow-sm ${
        isSupport
          ? "border-emerald-600/70"
          : "border-rose-600/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider ${
              isSupport ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
          >
            {doc.exhibit}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 capitalize">
            <Icon className="h-3.5 w-3.5" />
            {doc.doc_type}
          </span>
          <span className="text-[11px] text-slate-400">·</span>
          <span className="text-[11px] tabular-nums text-slate-500">{doc.date}</span>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${confTone(doc.confidence)}`}>
          {doc.confidence}
        </span>
      </div>
      <blockquote
        className={`mt-2.5 border-l-2 pl-3 text-sm italic leading-snug text-slate-800 ${
          isSupport ? "border-emerald-500" : "border-rose-500"
        }`}
        style={{ fontFamily: "Fraunces, serif" }}
      >
        "{doc.passage}"
      </blockquote>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
        <FileSearch className="h-3 w-3" />
        {doc.location}
      </div>
    </div>
  );
}

function WitnessCard({ w, kind }: { w: WitnessEvidence; kind: "support" | "contradict" }) {
  const isSupport = kind === "support";
  return (
    <div
      className={`rounded-md border-l-2 bg-white px-3 py-2.5 ring-1 ring-slate-100 ${
        isSupport ? "border-emerald-500" : "border-rose-500"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          {w.witness}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            recollection
          </span>
        </div>
        <span className="text-[10px] text-slate-400">{w.paragraph}</span>
      </div>
      <p className="mt-1.5 text-xs italic text-slate-600">"{w.passage}"</p>
      {w.reasoning && (
        <p className="mt-1 text-[11px] text-slate-400">↳ {w.reasoning}</p>
      )}
      <div className="mt-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${confTone(w.confidence)}`}>
          {w.confidence}
        </span>
      </div>
    </div>
  );
}
