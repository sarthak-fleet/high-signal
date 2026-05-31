from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import edgar


def test_form_d_events_from_search_response() -> None:
    payload = {
        "hits": {
            "hits": [
                {
                    "_source": {
                        "form": "D",
                        "file_date": "2026-05-15",
                        "adsh": "0002134995-26-000001",
                        "ciks": ["0002134995"],
                        "display_names": ["OpenAI-01, a Series of OpenAI Opp Fund LLC"],
                        "biz_locations": ["New York, NY"],
                        "items": ["06B", "3C"],
                    }
                }
            ]
        }
    }

    events = edgar.form_d_events_from_search(
        "OpenAI",
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "edgar_d"
    assert events[0].title == "SEC Form D: OpenAI-01, a Series of OpenAI Opp Fund LLC"
    assert "000213499526000001" in events[0].source_url


def test_pipeline_uses_expanded_edgar_for_wide_windows(monkeypatch) -> None:
    calls: list[tuple[list[str], int]] = []
    monkeypatch.setattr(
        pipeline,
        "load_entities",
        lambda: [
            type("Entity", (), {"ticker": "NVDA", "type": "public"})(),
            type("Entity", (), {"ticker": None, "type": "private"})(),
        ],
    )

    def fake_fetch_expanded(tickers: list[str], days: int):
        calls.append((tickers, days))
        return []

    monkeypatch.setattr(pipeline.edgar, "fetch_expanded", fake_fetch_expanded)

    assert pipeline.fetch("edgar", days=30) == []
    assert calls == [(["NVDA"], 30)]
