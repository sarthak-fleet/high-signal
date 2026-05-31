from __future__ import annotations

from datetime import datetime, timezone

from high_signal_ingest import pipeline
from high_signal_ingest.sources import gov_contracts


def test_sbir_events_from_response() -> None:
    payload = [
        {
            "agency_tracking_number": "SBIR-1",
            "proposal_award_date": "2026-05-31",
            "award_title": "AI test automation",
            "firm": "Example Robotics",
            "agency": "NSF",
            "phase": "Phase I",
            "award_amount": "275000",
            "abstract": "Automated testing for AI systems.",
            "award_link": "https://www.sbir.gov/award/1",
        }
    ]

    events = gov_contracts.sbir_events_from_response(
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "gov-contracts:sbir"
    assert events[0].source_url == "https://www.sbir.gov/award/1"
    assert "Example Robotics" in (events[0].content or "")


def test_sam_events_from_response() -> None:
    payload = {
        "opportunitiesData": [
            {
                "noticeId": "abc",
                "postedDate": "05/31/2026",
                "title": "Cybersecurity analytics",
                "uiLink": "https://sam.gov/opp/abc",
                "description": "Monitoring and analytics requirement.",
            }
        ]
    }

    events = gov_contracts.sam_events_from_response(
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "gov-contracts:sam"
    assert events[0].source_url == "https://sam.gov/opp/abc"


def test_usaspending_events_from_response() -> None:
    payload = {
        "results": [
            {
                "Award ID": "W911QX20C0023",
                "Recipient Name": "ECS FEDERAL, LLC",
                "Award Amount": 120575059.35,
                "Start Date": "2026-05-31",
                "End Date": "2027-03-11",
                "Awarding Agency": "Department of Defense",
                "Awarding Sub Agency": "Department of the Army",
                "Description": "Artificial intelligence prototype development.",
            }
        ]
    }

    events = gov_contracts.usaspending_events_from_response(
        "artificial intelligence",
        payload,
        datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    assert len(events) == 1
    assert events[0].source == "gov-contracts:usaspending"
    assert events[0].source_url == "https://www.usaspending.gov/award/W911QX20C0023"
    assert "Department of Defense" in (events[0].content or "")


def test_fetch_sam_skips_without_key(monkeypatch) -> None:
    monkeypatch.delenv("SAM_API_KEY", raising=False)

    assert gov_contracts.fetch_sam(api_key=None) == []


def test_pipeline_fetch_includes_gov_contracts(monkeypatch) -> None:
    calls: list[int] = []

    def fake_fetch_all(days: int):
        calls.append(days)
        return []

    monkeypatch.setattr(pipeline.gov_contracts, "fetch_all", fake_fetch_all)

    assert pipeline.fetch("gov-contracts", days=1) == []
    assert calls == [30]
