from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import guardian


def test_events_from_response_parses_guardian_results() -> None:
    payload = {
        "response": {
            "results": [
                {
                    "webTitle": "AI data center buildout accelerates",
                    "webUrl": "https://www.theguardian.com/technology/2026/may/31/ai",
                    "webPublicationDate": "2026-05-31T08:00:00Z",
                    "fields": {"trailText": "Operators are racing to add power capacity."},
                }
            ]
        }
    }

    events = guardian.events_from_response(
        "artificial intelligence OR AI",
        payload,
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "guardian"
    assert events[0].source_url == "https://www.theguardian.com/technology/2026/may/31/ai"
    assert events[0].primary_entity_id is None


def test_fetch_all_skips_without_api_key(monkeypatch) -> None:
    monkeypatch.delenv("GUARDIAN_API_KEY", raising=False)

    assert guardian.fetch_all(api_key=None) == []


def test_pipeline_fetch_includes_guardian(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.guardian, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("guardian", days=1) == []
    assert calls == [7]
