from __future__ import annotations

import json
from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import github_archive


def test_events_from_lines_filters_to_tracked_repos() -> None:
    lines = [
        json.dumps(
            {
                "id": "1",
                "type": "WatchEvent",
                "created_at": "2026-05-31T08:00:00Z",
                "repo": {"name": "NVIDIA/cutlass"},
                "actor": {"login": "example"},
                "payload": {"action": "started"},
            }
        ),
        json.dumps(
            {
                "id": "2",
                "type": "WatchEvent",
                "created_at": "2026-05-31T08:00:00Z",
                "repo": {"name": "other/repo"},
            }
        ),
    ]

    events = github_archive.events_from_lines(
        lines,
        {"nvidia/cutlass": "NVDA"},
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "github-archive:nvidia/cutlass"
    assert events[0].primary_entity_id == "NVDA"
    assert "example" in (events[0].content or "")


def test_pipeline_fetch_includes_github_archive(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.github_archive, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("github-archive", days=1) == []
    assert calls == [1]
