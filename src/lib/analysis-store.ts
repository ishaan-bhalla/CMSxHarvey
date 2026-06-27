import { useSyncExternalStore } from "react";

export type SupportingEvidence = {
  witness: string;
  passage: string;
  paragraph: string;
  confidence: string;
};

export type ContradictingEvidence = SupportingEvidence & {
  reasoning?: string;
};

export type MatrixRow = {
  allegation_summary: string;
  allegation_type: string;
  topic: string;
  paragraph_ref: string;
  witness_a: string;
  supporting: SupportingEvidence[];
  contradicting: ContradictingEvidence[];
  neutral: string[];
  not_addressed: number;
  gap: boolean;
  confidence: string;
};

export type GapItem = {
  allegation_summary: string;
  topic: string;
  paragraph_ref: string;
};

export type ContradictionItem = {
  allegation_summary: string;
  topic: string;
  contradicting: ContradictingEvidence[];
};

export type AnalysisResult = {
  primary_witness: string;
  comparison_witnesses: string[];
  total_claims: number;
  trial_readiness: "STRONG" | "MODERATE" | "VULNERABLE" | string;
  trial_readiness_score: number;
  matrix: MatrixRow[];
  gaps_count: number;
  contradictions_count: number;
  gaps: GapItem[];
  contradictions: ContradictionItem[];
};

let current: AnalysisResult | null = null;
const listeners = new Set<() => void>();

export const analysisStore = {
  get: () => current,
  set: (r: AnalysisResult | null) => {
    current = r;
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAnalysis() {
  return useSyncExternalStore(
    analysisStore.subscribe,
    analysisStore.get,
    () => null,
  );
}
