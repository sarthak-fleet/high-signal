from __future__ import annotations

from high_signal_ingest.sources import gov


def test_default_feeds_include_broadened_us_policy_sources() -> None:
    feed_ids = {feed[0] for feed in gov.DEFAULT_FEEDS}

    assert "us_bis" in feed_ids
    assert "us_ftc" in feed_ids
    assert "us_sec" in feed_ids
    assert "us_fcc" in feed_ids
    assert "us_dhs" in feed_ids
    assert "us_faa" in feed_ids
    assert "us_fda" in feed_ids


def test_relevance_filter_keeps_policy_terms() -> None:
    assert gov._is_relevant("FTC announces AI rulemaking", "")
    assert gov._is_relevant("Routine fisheries notice", "Quota adjustment") is False
