"""Smoke tests for seed loaders + entity gazetteer."""

from __future__ import annotations

from high_signal_ingest.extract.entities import gazetteer_match, primary_entity
from high_signal_ingest.seed import (
    entity_gazetteer,
    load_entities,
    load_relationships,
    load_signal_types,
    load_sources,
)


def test_entities_load() -> None:
    es = load_entities()
    assert len(es) >= 200, f"expected >=200 entities, got {len(es)}"
    ids = {e.id for e in es}
    for must in {"NVDA", "TSM", "ASML", "AMD", "MSFT", "GOOGL", "AMZN", "META"}:
        assert must in ids, f"missing {must}"


def test_relationships_load() -> None:
    rs = load_relationships()
    assert len(rs) >= 100
    # Weights bounded
    for r in rs:
        assert 0.0 < r.weight <= 1.0


def test_signal_types_load() -> None:
    ts = load_signal_types()
    assert len(ts) >= 20
    ids = {t.get("id") for t in ts}
    for must in {
        "capex_change_hyperscaler",
        "capex_change_neocloud",
        "gpu_lead_time_shift",
        "design_win",
        "export_restriction",
    }:
        assert must in ids


def test_sources_load() -> None:
    ss = load_sources()
    assert len(ss) >= 80
    tier1 = [s for s in ss if s.get("tier") == 1]
    assert len(tier1) >= 30


def test_gazetteer() -> None:
    es = load_entities()
    lut = entity_gazetteer(es)
    assert "nvda" in lut
    assert lut["nvda"] == "NVDA"


def test_gazetteer_match() -> None:
    text = "TSMC posts strong CoWoS guidance; NVDA expected to benefit."
    hits = gazetteer_match(text)
    assert "NVDA" in hits


def test_gazetteer_match_dollar_prefixed_ticker() -> None:
    # Prediction-market questions commonly use "$TICKER" — the old space-pad
    # heuristic missed these because "$" isn't a space. Regex word-boundary
    # match fixes it.
    text = "Will $ASML reach $1700 by year-end?"
    hits = gazetteer_match(text)
    assert "ASML" in hits


def test_gazetteer_match_punctuation_boundaries() -> None:
    # Trailing comma / period / question-mark / colon should all be word boundaries.
    for suffix in (",", ".", "?", ":", "!", ";"):
        text = f"NVDA{suffix} earnings beat"
        hits = gazetteer_match(text)
        assert "NVDA" in hits, f"missed NVDA before {suffix!r}"


def test_gazetteer_match_does_not_match_inside_word() -> None:
    # Substring inside a longer word — e.g. "MASML" — should NOT match ASML.
    text = "Some MASML or NVDAX gibberish"
    hits = gazetteer_match(text)
    assert "ASML" not in hits
    assert "NVDA" not in hits


def test_primary_entity() -> None:
    text = (
        "AMD signs multi-year supply deal with TSMC. Industry watchers note AMD's MI400 timeline."
    )
    p = primary_entity(text)
    assert p in {"AMD", "TSM"}
