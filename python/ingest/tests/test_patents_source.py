from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import patents
from high_signal_ingest.sources.patents import PatentAssignee


def test_events_from_response_maps_patent_assignee() -> None:
    payload = {
        "patents": [
            {
                "patent_number": "12345678",
                "patent_title": "Accelerated inference routing",
                "patent_date": "2026-05-31",
                "patent_abstract": "A system for routing inference requests.",
            }
        ]
    }

    events = patents.events_from_response(
        PatentAssignee("NVIDIA", "NVDA"),
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "patents:nvda"
    assert events[0].source_url == "https://patents.google.com/patent/US12345678"
    assert events[0].primary_entity_id == "NVDA"


def test_pipeline_fetch_includes_patents(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.patents, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("patents", days=1) == []
    assert calls == [365]
