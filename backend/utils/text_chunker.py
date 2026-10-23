import math
import re
from collections import Counter


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 500) -> list[str]:
    """
    Split text into overlapping chunks so no content is missed.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def find_relevant_chunks(text: str, keywords: list[str], max_chunks: int = 4) -> str:
    """
    Split full document into chunks, score each by keyword hits,
    return the top chunks concatenated.
    """
    chunks = chunk_text(text)
    scored = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        score = sum(chunk_lower.count(kw.lower()) for kw in keywords)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(reverse=True)
    top = [chunk for _, chunk in scored[:max_chunks]]
    return "\n---\n".join(top) if top else text[:3000]


STOPWORDS = set(
    "the a an of and or to in on for that was were be by with as at from their its it this not "
    "had have has which without despite being caused known".split()
)


def _terms(text: str) -> list[str]:
    # Six-letter prefixes act as a crude stemmer: "prosecuted" and "prosecution" match.
    return [w[:6] for w in re.findall(r"[a-z]+", text.lower())]


def query_terms(*texts: str) -> list[str]:
    """Search terms from keyword lists or an allegation's wording, minus stopwords."""
    return [w for t in texts for w in _terms(t) if w not in STOPWORDS and len(w) > 2]


def select_chunks_bm25(text: str, terms: list[str], chunk_size: int = 1000, overlap: int = 200,
                       budget: int = 6000) -> str:
    """
    Rank overlapping chunks with BM25 and keep the best ones that fit in `budget` characters,
    returned in document order. Smaller chunks let evidence from several parts of a long
    statement fit in the same prompt size.
    """
    chunks = chunk_text(text, chunk_size, overlap)
    docs = [_terms(c) for c in chunks]
    n = len(docs)
    avg_len = sum(map(len, docs)) / max(n, 1) or 1
    df = Counter(w for d in docs for w in set(d))
    scores = []
    for i, d in enumerate(docs):
        tf = Counter(d)
        score = sum(
            math.log(1 + (n - df[w] + 0.5) / (df[w] + 0.5)) * tf[w] * 2.2 / (tf[w] + 1.2 * (0.25 + 0.75 * len(d) / avg_len))
            for w in terms if tf[w]
        )
        scores.append((score, i))
    picked, used = [], 0
    for score, i in sorted(scores, reverse=True):
        if score <= 0 or used + len(chunks[i]) > budget:
            break
        picked.append(i)
        used += len(chunks[i])
    if not picked:
        return text[:budget]
    return "\n---\n".join(chunks[i] for i in sorted(picked))
