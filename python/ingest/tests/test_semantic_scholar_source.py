from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import semantic_scholar
from high_signal_ingest.sources.semantic_scholar import PaperQuery


def test_events_from_response_maps_paper_query() -> None:
    payload = {
        "data": [
            {
                "paperId": "abc123",
                "title": "Efficient LLM inference on accelerators",
                "url": "https://www.semanticscholar.org/paper/abc123",
                "publicationDate": "2026-05-31",
                "authors": [{"name": "Ada Example"}],
                "citationCount": 12,
                "abstract": "A paper about serving large language models.",
            }
        ]
    }

    events = semantic_scholar.events_from_response(
        PaperQuery("large language model inference", "NVDA"),
        payload,
        datetime(2026, 1, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "semantic-scholar"
    assert events[0].primary_entity_id == "NVDA"
    assert "Ada Example" in (events[0].content or "")


def test_pipeline_fetch_includes_semantic_scholar(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.semantic_scholar, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("semantic-scholar", days=1) == []
    assert calls == [30]
