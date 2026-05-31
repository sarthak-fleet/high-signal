from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import bluesky
from high_signal_ingest.sources.bluesky import BlueskyQuery


def test_events_from_response_parses_posts() -> None:
    payload = {
        "posts": [
            {
                "uri": "at://did:plc:test/app.bsky.feed.post/abc",
                "indexedAt": "2026-05-31T08:00:00Z",
                "record": {"text": "AI accelerator supply is tightening."},
                "author": {"handle": "example.com"},
            }
        ]
    }

    events = bluesky.events_from_response(
        BlueskyQuery("AI accelerator", "NVDA"),
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "bluesky"
    assert events[0].primary_entity_id == "NVDA"
    assert events[0].source_url == "https://bsky.app/profile/example.com/post/abc"


def test_pipeline_fetch_includes_bluesky(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.bluesky, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("bluesky", days=1) == []
    assert calls == [7]
