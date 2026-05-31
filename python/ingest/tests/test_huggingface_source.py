from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import huggingface


def test_events_from_items_maps_author_entity() -> None:
    items = [
        {
            "modelId": "openai/gpt-oss-20b",
            "lastModified": "2026-05-31T08:00:00.000Z",
            "downloads": 1200,
            "likes": 44,
            "tags": ["text-generation", "safetensors"],
        }
    ]

    events = huggingface.events_from_items(
        "model",
        items,
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "huggingface:model"
    assert events[0].source_url == "https://huggingface.co/openai/gpt-oss-20b"
    assert events[0].primary_entity_id == "OPENAI"


def test_events_from_items_falls_back_to_huggingface_entity() -> None:
    items = [{"id": "unknown-lab/new-model", "lastModified": "2026-05-31T08:00:00.000Z"}]

    events = huggingface.events_from_items(
        "model",
        items,
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].primary_entity_id == "HUGGINGFACE"


def test_pipeline_fetch_includes_huggingface(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.huggingface, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("huggingface", days=1) == []
    assert calls == [7]
