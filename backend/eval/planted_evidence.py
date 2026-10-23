"""
Planted-evidence test: classify synthetic paragraphs whose answer is known,
and check both the verdict and that the cited quote comes from the planted paragraph.

    python backend/eval/planted_evidence.py --env path/to/.env [--repeats 1]
"""
import argparse
import json
import os
import sys
from collections import Counter
from datetime import date

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

parser = argparse.ArgumentParser()
parser.add_argument("--env", help=".env file with ANTHROPIC_API_KEY")
parser.add_argument("--repeats", type=int, default=1)
args = parser.parse_args()

from dotenv import load_dotenv
if args.env:
    load_dotenv(args.env)

from services.document_parser import ParsedDocument
from services.pleading_generator import HORIZON_PLEADINGS, classify_witness_against_pleading
from clients.claude_client import start_meter

FILLER_BEFORE = [
    "1. I make this statement from my own recollection and from the documents I still hold.",
    "2. I have lived in Shropshire for most of my life. I am married and have two children.",
]
FILLER_AFTER = [
    "4. I left that role in 2012 and now work part-time at a garden centre.",
    "5. I believe the facts stated in this witness statement are true.",
]

with open(os.path.join(BACKEND, "eval", "planted_cases.json")) as f:
    cases = json.load(f)["cases"]
allegations = {a["id"]: a for a in HORIZON_PLEADINGS}

meter = start_meter()
rows = []
for repeat in range(args.repeats):
    for case in cases:
        text = "\n\n".join(FILLER_BEFORE + ["3. " + case["paragraph"]] + FILLER_AFTER)
        doc = ParsedDocument(
            filename=f"{case['id']}.txt",
            witness_name=f"Witness {case['id']}",
            statement_number=case["id"],
            date="Unknown",
            raw_text=text,
            pages=1,
        )
        try:
            result = classify_witness_against_pleading(allegations[case["allegation_id"]], doc)
            verdict = result["verdict"]
            passage = result.get("relevant_passage")
        except Exception as e:
            verdict, passage = "ERROR", None
            print(f"{case['id']}: ERROR {e}")

        quote_in_plant = None
        if verdict in ("SUPPORTS", "CONTRADICTS"):
            planted = " ".join(case["paragraph"].split()).lower()
            quote_in_plant = bool(passage) and " ".join(passage.split()).lower() in planted
        rows.append({
            "id": case["id"], "repeat": repeat, "expected": case["expected"],
            "verdict": verdict, "correct": verdict == case["expected"],
            "quote_in_planted_paragraph": quote_in_plant,
        })
        print(f"{case['id']} r{repeat}: expected {case['expected']:<14} got {verdict:<14} {'ok' if verdict == case['expected'] else 'MISS'}")

if all(r["verdict"] == "ERROR" for r in rows):
    sys.exit("Every call failed (see errors above); nothing saved.")

correct = sum(r["correct"] for r in rows)
by_expected = {}
for label in ("SUPPORTS", "CONTRADICTS", "NOT_ADDRESSED"):
    subset = [r for r in rows if r["expected"] == label]
    by_expected[label] = {"correct": sum(r["correct"] for r in subset), "total": len(subset)}
confusion = Counter((r["expected"], r["verdict"]) for r in rows)
cited = [r for r in rows if r["quote_in_planted_paragraph"] is not None]
false_evidence = sum(1 for r in rows if r["expected"] == "NOT_ADDRESSED" and r["verdict"] in ("SUPPORTS", "CONTRADICTS"))

summary = {
    "date": date.today().isoformat(),
    "cases": len(cases),
    "repeats": args.repeats,
    "accuracy": f"{correct}/{len(rows)}",
    "by_expected": by_expected,
    "false_evidence_on_hard_negatives": false_evidence,
    "quotes_from_planted_paragraph": f"{sum(r['quote_in_planted_paragraph'] for r in cited)}/{len(cited)}",
    "confusion": {f"{e} -> {v}": n for (e, v), n in sorted(confusion.items())},
    "usage": meter.summary(),
    "rows": rows,
}
out = os.path.join(BACKEND, "eval", "results", f"planted_{summary['date']}.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(summary, f, indent=2)
print(json.dumps({k: v for k, v in summary.items() if k != "rows"}, indent=2))
print(f"Saved {out}")
