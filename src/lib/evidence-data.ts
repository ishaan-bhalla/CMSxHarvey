export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Verdict = "SUPPORTS" | "CONTRADICTS";
export type Topic =
  | "horizon_system"
  | "knowledge"
  | "prosecutions"
  | "management"
  | "financial_losses"
  | (string & {});

export type WitnessEvidence = {
  witness: string;
  statement_id: string;
  verdict: Verdict;
  confidence: Confidence;
  relevant_passage: string;
  paragraph_ref: string;
  reasoning?: string;
};

export type Claim = {
  allegation_id: number;
  allegation: string;
  topic: Topic;
  gap: boolean;
  supporting: WitnessEvidence[];
  contradicting: WitnessEvidence[];
  not_addressed: string[];
};

export type Report = {
  documents_analysed: string[];
  total_allegations: number;
  trial_readiness: "STRONG" | "MODERATE" | "VULNERABLE";
  trial_readiness_score: number;
  matrix: Claim[];
  gaps: Claim[];
  contradictions: Claim[];
};

export const EVIDENCE_DATA: Report = {
  documents_analysed: ["Jane Smith", "Robert Jones", "Aisha Khan"],
  total_allegations: 8,
  trial_readiness: "MODERATE",
  trial_readiness_score: 62.5,
  matrix: [
    {
      allegation_id: 1,
      allegation:
        "The Horizon IT system contained bugs, errors and defects that caused false shortfalls in subpostmasters' branch accounts.",
      topic: "horizon_system",
      gap: false,
      supporting: [
        {
          witness: "Jane Smith",
          statement_id: "WITN0001",
          verdict: "SUPPORTS",
          confidence: "HIGH",
          relevant_passage:
            "The system regularly showed shortfalls that did not exist.",
          paragraph_ref: "para 12",
          reasoning: "Directly confirms false shortfalls.",
        },
      ],
      contradicting: [],
      not_addressed: ["Aisha Khan"],
    },
    {
      allegation_id: 2,
      allegation:
        "Post Office Limited knew or ought to have known about defects in the Horizon system before and during the prosecution of subpostmasters.",
      topic: "knowledge",
      gap: false,
      supporting: [],
      contradicting: [
        {
          witness: "Robert Jones",
          statement_id: "WITN0002",
          verdict: "CONTRADICTS",
          confidence: "HIGH",
          relevant_passage:
            "We had no reports of systemic issues at that time.",
          paragraph_ref: "para 5",
          reasoning: "Denies prior knowledge of defects.",
        },
      ],
      not_addressed: ["Aisha Khan"],
    },
    {
      allegation_id: 3,
      allegation:
        "Subpostmasters were wrongly prosecuted for false accounting and theft as a result of Horizon-generated shortfalls.",
      topic: "prosecutions",
      gap: true,
      supporting: [],
      contradicting: [],
      not_addressed: ["Jane Smith", "Robert Jones", "Aisha Khan"],
    },
  ],
  gaps: [],
  contradictions: [],
};

// Derive gaps and contradictions from the matrix rather than trusting the
// top-level arrays the backend may send.
export function deriveGaps(report: Report): Claim[] {
  return report.matrix.filter((c) => c.gap);
}

export function deriveContradictions(report: Report): Claim[] {
  return report.matrix.filter((c) => c.contradicting.length > 0);
}
