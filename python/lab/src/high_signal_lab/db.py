"""Postgres connection helpers for the Lab substrate."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import psycopg

DEFAULT_DSN = os.environ.get(
    "HIGH_SIGNAL_LAB_DSN",
    "postgresql://lab:lab@localhost:5433/highsignal_lab",
)


@contextmanager
def connect(dsn: str | None = None) -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(dsn or DEFAULT_DSN, autocommit=False)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
