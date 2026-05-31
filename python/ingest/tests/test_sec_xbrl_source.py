from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import sec_xbrl


def test_ticker_cik_map() -> None:
    assert sec_xbrl.ticker_cik_map({"0": {"ticker": "NVDA", "cik_str": 1045810}}) == {
        "NVDA": "0001045810"
    }


def test_event_from_companyfacts() -> None:
    payload = {
        "facts": {
            "us-gaap": {
                "Revenues": {
                    "units": {
                        "USD": [
                            {
                                "val": 100,
                                "filed": "2026-05-31",
                                "form": "10-Q",
                            }
                        ]
                    }
                },
                "NetIncomeLoss": {
                    "units": {
                        "USD": [
                            {
                                "val": 20,
                                "filed": "2026-05-31",
                                "form": "10-Q",
                            }
                        ]
                    }
                },
            }
        }
    }

    event = sec_xbrl.event_from_companyfacts(
        "NVDA",
        "NVDA",
        "0001045810",
        payload,
        datetime(2026, 1, 1, tzinfo=timezone.utc),
    )

    assert event is not None
    assert event.source == "sec-xbrl:nvda"
    assert event.primary_entity_id == "NVDA"
    assert "revenue: 100" in (event.content or "")


def test_pipeline_fetch_includes_sec_xbrl(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.sec_xbrl, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("sec-xbrl", days=1) == []
    assert calls == [120]
