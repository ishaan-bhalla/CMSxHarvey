export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type DocType = "email" | "contract" | "invoice" | "minutes";

export type WitnessEvidence = {
  witness: string;
  passage: string;
  paragraph: string;
  confidence: Confidence;
  reasoning?: string;
};

export type DocEvidence = {
  exhibit: string;
  doc_type: DocType;
  date: string;
  passage: string;
  location: string;
  confidence: Confidence;
};

export type Claim = {
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

export type EvidenceData = {
  primary_witness: string;
  comparison_witnesses: string[];
  total_claims: number;
  trial_readiness: "STRONG" | "MODERATE" | "VULNERABLE";
  trial_readiness_score: number;
  documentary_corroboration_score: number;
  matrix: Claim[];
};

export const EVIDENCE_DATA: EvidenceData = {
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

export function findExhibit(exhibit: string) {
  for (const claim of EVIDENCE_DATA.matrix) {
    const doc =
      claim.documents_supporting.find((d) => d.exhibit === exhibit) ||
      claim.documents_contradicting.find((d) => d.exhibit === exhibit);
    if (doc) {
      const role: "support" | "contradict" = claim.documents_supporting.some(
        (d) => d.exhibit === exhibit,
      )
        ? "support"
        : "contradict";
      return { doc, claim, role };
    }
  }
  return null;
}
