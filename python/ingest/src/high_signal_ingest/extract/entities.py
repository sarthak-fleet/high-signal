"""Entity extraction — gazetteer-first, GLiNER for novel mentions."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Iterable

from ..seed import entity_gazetteer, load_entities


@lru_cache(maxsize=1)
def _gazetteer() -> dict[str, str]:
    return entity_gazetteer(load_entities())


@lru_cache(maxsize=1)
def _compiled_patterns() -> list[tuple[re.Pattern[str], str]]:
    """Pre-compile ``\\bTERM\\b`` patterns per gazetteer entry.

    Regex word boundaries treat ``$``, punctuation, and whitespace uniformly,
    so ``$ASML``, ``ASML.``, ``ASML,`` and ``ASML 's`` all match a bare ``asml``
    entry — which the old space-pad heuristic missed for ``$``-prefixed tickers.
    """
    out: list[tuple[re.Pattern[str], str]] = []
    for term, eid in _gazetteer().items():
        if len(term) < 3:
            continue
        out.append((re.compile(rf"\b{re.escape(term)}\b"), eid))
    return out


def gazetteer_match(text: str) -> list[str]:
    """Cheap deterministic match against known entities. Returns entity IDs."""
    if not text:
        return []
    needle = text.lower()
    hits: set[str] = set()
    for pattern, eid in _compiled_patterns():
        if pattern.search(needle):
            hits.add(eid)
    return sorted(hits)


def gliner_extract(text: str, threshold: float = 0.55) -> list[dict]:
    """GLiNER zero-shot NER for company/product/person mentions.

    Returns list of {text, label, score, start, end}. Lazy-imports GLiNER.
    """
    model = _load_gliner()
    if model is None:
        return []
    labels = ["company", "product", "person", "technology", "country", "regulator"]
    return model.predict_entities(text[:8000], labels, threshold=threshold)


@lru_cache(maxsize=1)
def _load_gliner():
    try:
        from gliner import GLiNER  # type: ignore

        return GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
    except Exception:
        return None


def primary_entity(text: str, candidates: Iterable[str] | None = None) -> str | None:
    """Pick the most-mentioned tracked entity in `text`."""
    hits = gazetteer_match(text)
    if not hits:
        return None
    if candidates:
        cand_set = set(candidates)
        scoped = [h for h in hits if h in cand_set]
        if scoped:
            return scoped[0]
    return hits[0]
