from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import jobs
from high_signal_ingest.sources.jobs import JobBoardTarget


def test_greenhouse_events_from_payload() -> None:
    target = JobBoardTarget("greenhouse", "anthropic", "ANTHROPIC", "Anthropic")
    payload = {
        "jobs": [
            {
                "id": 123,
                "title": "Forward Deployed Engineer",
                "absolute_url": "https://boards.greenhouse.io/anthropic/jobs/123",
                "updated_at": "2026-05-31T05:00:00-04:00",
                "location": {"name": "San Francisco"},
            }
        ]
    }

    events = jobs.greenhouse_events_from_payload(
        target,
        payload,
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "jobs:greenhouse:anthropic"
    assert events[0].primary_entity_id == "ANTHROPIC"
    assert "Forward Deployed" in (events[0].title or "")


def test_lever_events_from_payload() -> None:
    target = JobBoardTarget("lever", "huggingface", "HUGGINGFACE", "Hugging Face")
    payload = [
        {
            "id": "abc",
            "text": "Inference Engineer",
            "hostedUrl": "https://jobs.lever.co/huggingface/abc",
            "createdAt": 1_780_312_400_000,
            "categories": {"team": "Inference", "location": "Remote"},
        }
    ]

    events = jobs.lever_events_from_payload(
        target,
        payload,
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "jobs:lever:huggingface"
    assert events[0].primary_entity_id == "HUGGINGFACE"


def test_ashby_events_from_payload() -> None:
    target = JobBoardTarget("ashby", "OpenAI", "OPENAI", "OpenAI")
    payload = {
        "jobs": [
            {
                "id": "job1",
                "title": "Model Behavior Engineer",
                "externalLink": "https://jobs.ashbyhq.com/OpenAI/job1",
                "publishedAt": "2026-05-31T08:00:00Z",
                "location": {"name": "San Francisco"},
            }
        ]
    }

    events = jobs.ashby_events_from_payload(
        target,
        payload,
        datetime(2026, 5, 31, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "jobs:ashby:OpenAI"
    assert events[0].primary_entity_id == "OPENAI"


def test_pipeline_fetch_includes_jobs(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.jobs, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("jobs", days=1) == []
    assert calls == [14]
