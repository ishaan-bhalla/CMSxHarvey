import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import {
  EVIDENCE_DATA,
  type Claim,
  type WitnessEvidence,
} from "../lib/evidence-data";

export const Route = createFileRoute("/statement/$statementId")({
  head: ({ params }) => ({
    meta: [
      { title: `Statement ${params.statementId} — Evidence Matrix` },
      {
        name: "description",
        content: `Witness statement ${params.statementId} and the allegations it addresses.`,
      },
    ],
  }),
  loader: ({ params }) => {
    const refs: { claim: Claim; entry: WitnessEvidence; kind: "support" | "contradict" }[] = [];
    let witness: string | null = null;
    for (const claim of EVIDENCE_DATA.matrix) {
      for (const e of claim.supporting) {
        if (e.statement_id === params.statementId) {
          refs.push({ claim, entry: e, kind: "support" });
          witness = e.witness;
        }
      }
      for (const e of claim.contradicting) {
        if (e.statement_id === params.statementId) {
          refs.push({ claim, entry: e, kind: "contradict" });
          witness = e.witness;
        }
      }
    }
    if (!witness) throw notFound();
    // TODO: replace with the real Google Drive / backend URL for this statement
    const pdf_url = `https://www.africau.edu/images/default/sample.pdf`;
    return { statementId: params.statementId, witness, refs, pdf_url };
  },
  component: StatementPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">Statement not found</h1>
        <Link
          to="/evidence-matrix"
          className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Evidence Matrix
        </Link>
      </div>
    </div>
  ),
});

function toEmbedUrl(url: string) {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  const o = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (o) return `https://drive.google.com/file/d/${o[1]}/preview`;
  return url;
}

function StatementPage() {
  const { statementId, witness, refs, pdf_url } = Route.useLoaderData();
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <Link
            to="/evidence-matrix"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Evidence Matrix
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold tracking-wider text-white">
            {statementId}
          </span>
          <span className="text-xs font-medium text-slate-600">
            Witness statement
          </span>
        </div>
        <h1
          className="mt-3 text-3xl font-semibold tracking-tight text-slate-900"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {witness}
        </h1>

        {/* File card */}
        <section className="mt-8">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Source document
          </div>
          <button
            type="button"
            onClick={() => setOpenUrl(pdf_url)}
            className="group flex w-full max-w-xs flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-400 hover:shadow-md"
          >
            <div className="flex h-32 items-center justify-center bg-slate-50 border-b border-slate-200 group-hover:bg-slate-100">
              <FileText className="h-12 w-12 text-rose-600" strokeWidth={1.25} />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span className="text-xs font-medium text-slate-800 line-clamp-2 break-all">
                {statementId}.pdf
              </span>
            </div>
          </button>
        </section>

        {/* Referenced allegations */}
        <section className="mt-10">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Cited on {refs.length} allegation{refs.length === 1 ? "" : "s"}
          </div>
          <div className="space-y-4">
            {refs.map(({ claim, entry, kind }: { claim: Claim; entry: WitnessEvidence; kind: "support" | "contradict" }) => {
              const isSupport = kind === "support";
              return (
                <article
                  key={`${claim.allegation_id}-${kind}`}
                  className={`rounded-xl border bg-white p-5 shadow-sm ${
                    isSupport ? "border-emerald-200" : "border-rose-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Allegation #{claim.allegation_id}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
                        isSupport ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      {isSupport ? "Supports" : "Contradicts"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {entry.paragraph_ref}
                    </span>
                  </div>
                  <p
                    className="mt-2 text-base font-semibold leading-snug text-slate-900"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    "{claim.allegation}"
                  </p>
                  <blockquote
                    className={`mt-3 border-l-2 pl-3 text-sm italic text-slate-700 ${
                      isSupport ? "border-emerald-500" : "border-rose-500"
                    }`}
                  >
                    "{entry.relevant_passage}"
                  </blockquote>
                  {entry.reasoning && (
                    <p className="mt-2 text-xs text-slate-500">↳ {entry.reasoning}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* PDF preview modal */}
      {openUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onClick={() => setOpenUrl(null)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-xs font-medium truncate">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {statementId} — {witness}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setOpenUrl(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={toEmbedUrl(openUrl)}
              title="Statement preview"
              className="h-full w-full rounded-lg bg-white"
              style={{ border: 0 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
