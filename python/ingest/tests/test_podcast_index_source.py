from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import podcast_index
from high_signal_ingest.sources.podcast_index import PodcastFeed


def test_events_from_response_parses_episode() -> None:
    payload = {
        "items": [
            {
                "id": 123,
                "datePublished": 1780200000,
                "title": "AI infrastructure episode",
                "description": "Discussion of inference costs.",
                "link": "https://example.com/episode",
            }
        ]
    }

    events = podcast_index.events_from_response(
        PodcastFeed("Example", 1),
        payload,
        datetime(2026, 1, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "podcast-index:1"
    assert events[0].source_url == "https://example.com/episode"


def test_fetch_all_skips_without_keys(monkeypatch) -> None:
    monkeypatch.delenv("PODCAST_INDEX_KEY", raising=False)
    monkeypatch.delenv("PODCAST_INDEX_SECRET", raising=False)

    assert podcast_index.fetch_all() == []


def test_pipeline_fetch_includes_podcast_index(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.podcast_index, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("podcast-index", days=1) == []
    assert calls == [14]
