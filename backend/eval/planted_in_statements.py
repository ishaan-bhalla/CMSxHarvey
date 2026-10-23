"""
Planted evidence inside real statements: hide each supporting or contradicting planted
paragraph at several points in long real witness statements, and check whether the
retrieval step passes it to the model (and, with --classify, whether the verdict and
quote come out right). This tests for false evidential gaps caused by retrieval.

    python backend/eval/planted_in_statements.py --data-dir data/raw [--classify]
"""
import argparse
import glob
import json
import os
import sys
from datetime import date

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

parser = argparse.ArgumentParser()
parser.add_argument("--env", help=".env file with API keys")
parser.add_argument("--data-dir", required=True, help="folder of witness statement PDFs")
parser.add_argument("--hosts", nargs="+", default=["Steve Bansal", "Roderick Mark Ismay", "Peter John Rowley"],
                    help="witnesses whose statements hide the planted paragraphs")
parser.add_argument("--positions", nargs="+", type=float, default=[0.1, 0.5, 0.9],
                    help="where to insert, as a fraction of the statement")
parser.add_argument("--classify", action="store_true", help="also run the model on each document")
parser.add_argument("--tag", default="", help="suffix for the results file name")
args = parser.parse_args()

from dotenv import load_dotenv
if args.env:
    load_dotenv(args.env)

from dataclasses import replace
from services.document_parser import parse_document
from services.pleading_generator import (HORIZON_PLEADINGS, classify_witness_against_pleading,
                                         relevant_excerpts, verify_quote)
from clients.claude_client import start_meter

with open(os.path.join(BACKEND, "eval", "planted_cases.json")) as f:
    cases = [c for c in json.load(f)["cases"] if c["expected"] != "NOT_ADDRESSED"]
allegations = {a["id"]: a for a in HORIZON_PLEADINGS}

hosts, wanted = [], set(args.hosts)
for path in sorted(glob.glob(os.path.join(args.data_dir, "*.pdf"))):
    try:
        doc = parse_document(path)
    except Exception:
        continue
    if doc.witness_name in wanted:
        hosts.append(doc)
        wanted.discard(doc.witness_name)
if wanted:
    sys.exit(f"Not found in {args.data_dir}: {sorted(wanted)}")


def plant(text: str, paragraph: str, position: float) -> str:
    """Insert the paragraph at the paragraph break nearest the given position."""
    target = int(len(text) * position)
    cut = text.rfind("\n", 0, target)
    cut = target if cut == -1 else cut
    return text[:cut] + "\n\n" + paragraph + "\n\n" + text[cut:]


meter = start_meter() if args.classify else None
rows = []
for host in hosts:
    for case in cases:
        for position in args.positions:
            doc = replace(host, raw_text=plant(host.raw_text, case["paragraph"], position))
            excerpts = relevant_excerpts(allegations[case["allegation_id"]], doc)
            row = {"host": host.witness_name, "host_chars": len(host.raw_text), "id": case["id"],
                   "position": position, "expected": case["expected"],
                   "reached_model": verify_quote(case["paragraph"], excerpts)}
            if args.classify:
                try:
                    result = classify_witness_against_pleading(allegations[case["allegation_id"]], doc)
                    row["verdict"] = result["verdict"]
                    passage = result.get("relevant_passage")
                    row["quote_from_plant"] = bool(passage) and verify_quote(passage, case["paragraph"])
                except Exception as e:
                    row["verdict"], row["quote_from_plant"] = "ERROR", False
                    print(f"ERROR {e}")
                row["found_plant"] = row["verdict"] == case["expected"] and row["quote_from_plant"]
            rows.append(row)
            print(f"{host.witness_name[:18]:<18} {case['id']} @{position}: reached={row['reached_model']}"
                  + (f" verdict={row['verdict']} plant_quote={row['quote_from_plant']}" if args.classify else ""))

n = len(rows)
summary = {
    "date": date.today().isoformat(),
    "hosts": {h.witness_name: len(h.raw_text) for h in hosts},
    "cases": len(cases),
    "positions": args.positions,
    "documents": n,
    "planted_paragraph_reached_model": f"{sum(r['reached_model'] for r in rows)}/{n}",
    "by_position": {str(p): f"{sum(r['reached_model'] for r in rows if r['position'] == p)}/"
                            f"{sum(r['position'] == p for r in rows)}" for p in args.positions},
}
if args.classify:
    summary["planted_evidence_found_and_quoted"] = f"{sum(r['found_plant'] for r in rows)}/{n}"
    summary["verdicts"] = {v: sum(r["verdict"] == v for r in rows) for v in sorted({r["verdict"] for r in rows})}
    summary["usage"] = meter.summary()
summary["rows"] = rows
out = os.path.join(BACKEND, "eval", "results", f"planted_in_statements_{summary['date']}{args.tag}.json")
with open(out, "w") as f:
    json.dump(summary, f, indent=2)
print(json.dumps({k: v for k, v in summary.items() if k != "rows"}, indent=2))
print(f"Saved {out}")
