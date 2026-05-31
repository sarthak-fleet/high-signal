from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import regulations
from high_signal_ingest.sources.regulations import RegulationQuery


def test_events_from_response_parses_regulations_document() -> None:
    payload = {
        "data": [
            {
                "id": "FTC-2026-0001-0001",
                "attributes": {
                    "title": "Artificial intelligence rulemaking",
                    "postedDate": "2026-05-31T08:00:00Z",
                    "agencyId": "FTC",
                    "documentType": "Proposed Rule",
                    "docketId": "FTC-2026-0001",
                    "commentEndDate": "2026-07-01",
                },
            }
        ]
    }

    events = regulations.events_from_response(
        RegulationQuery("artificial intelligence"),
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "regulations-gov"
    assert events[0].source_url == "https://www.regulations.gov/document/FTC-2026-0001-0001"
    assert "FTC" in (events[0].content or "")


def test_fetch_all_skips_without_api_key(monkeypatch) -> None:
    monkeypatch.delenv("REGULATIONS_GOV_API_KEY", raising=False)

    assert regulations.fetch_all(api_key=None) == []


def test_pipeline_fetch_includes_regulations(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.regulations, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("regulations", days=1) == []
    assert calls == [30]
