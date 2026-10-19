import type { AnalysisResult } from "./analysis-store";
import { transformPleadingResult } from "./transform";

const BASE = import.meta.env.VITE_API_URL || "https://cmsxharvey.onrender.com";

export async function fetchDocuments(): Promise<{ documents: { filename: string; witness_name: string }[]; count: number }> {
  const r = await fetch(`${BASE}/documents`);
  if (!r.ok) throw new Error(`Failed to fetch documents (${r.status})`);
  return r.json();
}

export async function submitAnalysis(
  primary: string,
  comparisons: string[],
): Promise<{ job_id: string; status: string }> {
  const prefix = (n: string) => (n.startsWith("data/raw/") ? n : `data/raw/${n}`);
  const r = await fetch(`${BASE}/analyze/pleading`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      primary_pdf: prefix(primary),
      comparison_pdfs: comparisons.map(prefix),
    }),
  });
  if (!r.ok) throw new Error(`Analysis failed (${r.status})`);
  return r.json();
}

export async function pollJob(jobId: string): Promise<{
  job_id: string;
  status: string;
  progress: number;
  progress_message: string;
  result: AnalysisResult | null;
  error: string | null;
}> {
  const r = await fetch(`${BASE}/jobs/${jobId}`);
  if (!r.ok) throw new Error(`Poll failed (${r.status})`);
  return r.json();
}

export async function fetchDemo(): Promise<AnalysisResult> {
  // The demo is a saved result, so serve it with the site (instant, no backend
  // needed) and only fall back to the backend if the static copy is missing.
  let r = await fetch("/demo_result.json");
  if (!r.ok) r = await fetch(`${BASE}/demo`);
  if (!r.ok) throw new Error(`Demo not available (${r.status})`);
  const raw = await r.json();
  return transformPleadingResult(raw);
}

export async function submitReview(
  jobId: string,
  allegationId: number,
  aiVerdict: string,
  decision: "accepted" | "overruled" | "rejected",
  reviewerNote: string = ""
): Promise<void> {
  await fetch(`${BASE}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: jobId,
      allegation_id: allegationId,
      ai_verdict: aiVerdict,
      decision,
      reviewer_note: reviewerNote,
    }),
  });
}
