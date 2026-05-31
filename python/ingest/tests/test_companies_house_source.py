from __future__ import annotations

from high_signal_ingest import pipeline
from high_signal_ingest.sources import companies_house


def test_event_from_search_item_maps_company() -> None:
    event = companies_house.event_from_search_item(
        "GRAPHCORE",
        "Graphcore Ltd",
        {
            "company_number": "10185006",
            "title": "GRAPHCORE LIMITED",
            "company_status": "active",
            "company_type": "ltd",
            "address_snippet": "Bristol",
        },
    )

    assert event is not None
    assert event.source == "companies-house"
    assert event.primary_entity_id == "GRAPHCORE"
    assert event.source_url.endswith("/company/10185006")


def test_fetch_all_skips_without_api_key(monkeypatch) -> None:
    monkeypatch.delenv("COMPANIES_HOUSE_API_KEY", raising=False)

    assert companies_house.fetch_all(api_key=None) == []


def test_pipeline_fetch_includes_companies_house(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.companies_house, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("companies-house", days=1) == []
    assert calls == [1]
