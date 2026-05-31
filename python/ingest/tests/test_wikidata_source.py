from __future__ import annotations

from high_signal_ingest import pipeline
from high_signal_ingest.sources import wikidata


def test_event_from_search_result_maps_entity() -> None:
    event = wikidata.event_from_search_result(
        "NVDA",
        "NVIDIA Corporation",
        {
            "id": "Q182477",
            "label": "Nvidia",
            "description": "American technology company",
            "concepturi": "https://www.wikidata.org/wiki/Q182477",
        },
    )

    assert event is not None
    assert event.source == "wikidata"
    assert event.source_url == "https://www.wikidata.org/wiki/Q182477"
    assert event.primary_entity_id == "NVDA"


def test_pipeline_fetch_includes_wikidata(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.wikidata, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("wikidata", days=1) == []
    assert calls == [1]
