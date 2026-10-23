"""
Stability test: run the same witnesses through the pipeline several times
and measure how often each witness-allegation verdict comes out the same.

    python backend/eval/stability.py --env path/to/.env --data-dir path/to/data/raw \
        --witnesses "Steve Bansal" "Roderick Mark Ismay" [--runs 3]
"""
import argparse
import glob
import json
import os
import sys
from collections import Counter
from datetime import date

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

parser = argparse.ArgumentParser()
parser.add_argument("--env", help=".env file with ANTHROPIC_API_KEY")
parser.add_argument("--data-dir", required=True, help="folder of witness statement PDFs")
parser.add_argument("--witnesses", nargs="+", required=True, help="witness names as parsed from the PDFs")
parser.add_argument("--runs", type=int, default=3)
args = parser.parse_args()

from dotenv import load_dotenv
if args.env:
    load_dotenv(args.env)

from services.document_parser import parse_document
from services.pleading_generator import analyse_documents

wanted = set(args.witnesses)
documents = []
for path in sorted(glob.glob(os.path.join(args.data_dir, "*.pdf"))):
    try:
        doc = parse_document(path)
    except Exception:
        continue
    if doc.witness_name in wanted:
        documents.append(doc)
        wanted.discard(doc.witness_name)
if wanted:
    sys.exit(f"Not found in {args.data_dir}: {sorted(wanted)}")


def verdicts(result: dict) -> dict:
    out = {}
    for row in result["matrix"]:
        for r in row["supporting"]:
            out[(row["allegation_id"], r["witness"])] = "SUPPORTS"
        for r in row["contradicting"]:
            out[(row["allegation_id"], r["witness"])] = "CONTRADICTS"
        for name in row["not_addressed"]:
            out[(row["allegation_id"], name)] = "NOT_ADDRESSED/UNVERIFIED"
        for r in row["failed"]:
            out[(row["allegation_id"], r["witness"])] = "FAILED"
    return out


runs, usages = [], []
for i in range(args.runs):
    print(f"\n=== Run {i + 1}/{args.runs}")
    result = analyse_documents(documents, with_case_law=False)
    runs.append(verdicts(result))
    usages.append(result["usage"])

pairs = sorted(runs[0])
unanimous = [p for p in pairs if len({run.get(p) for run in runs}) == 1]
evidence_pairs = [p for p in pairs if any(run.get(p) in ("SUPPORTS", "CONTRADICTS") for run in runs)]
evidence_unanimous = [p for p in evidence_pairs if p in unanimous]
flips = [
    {"allegation_id": a, "witness": w, "verdicts": [run.get((a, w)) for run in runs]}
    for (a, w) in pairs if (a, w) not in unanimous
]

summary = {
    "date": date.today().isoformat(),
    "witnesses": [d.witness_name for d in documents],
    "runs": args.runs,
    "pairs": len(pairs),
    "same_verdict_every_run": f"{len(unanimous)}/{len(pairs)}",
    "same_verdict_where_any_run_found_evidence": f"{len(evidence_unanimous)}/{len(evidence_pairs)}",
    "verdict_counts_run1": dict(Counter(runs[0].values())),
    "flips": flips,
    "usage_per_run": usages,
}
out = os.path.join(BACKEND, "eval", "results", f"stability_{summary['date']}.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(summary, f, indent=2)
print(json.dumps({k: v for k, v in summary.items() if k != "flips"}, indent=2))
print(f"{len(flips)} pairs changed verdict between runs. Saved {out}")
