from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import metaculus
from high_signal_ingest.sources.metaculus import MetaculusQuery


def test_events_from_response_parses_post() -> None:
    payload = {
        "results": [
            {
                "id": 123,
                "title": "Will AI inference costs fall?",
                "published_at": "2026-05-31T08:00:00Z",
                "status": "open",
                "scheduled_close_time": "2026-12-31T00:00:00Z",
                "question": {"aggregations": {"recency_weighted": {"latest": {"centers": [0.62]}}}},
            }
        ]
    }

    events = metaculus.events_from_response(
        MetaculusQuery("artificial intelligence"),
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "metaculus"
    assert events[0].source_url == "https://www.metaculus.com/questions/123/"
    assert "Aggregations" in (events[0].content or "")


def test_fetch_all_skips_without_token(monkeypatch) -> None:
    monkeypatch.delenv("METACULUS_TOKEN", raising=False)

    assert metaculus.fetch_all(token=None) == []


def test_pipeline_fetch_includes_metaculus(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.metaculus, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("metaculus", days=1) == []
    assert calls == [30]
