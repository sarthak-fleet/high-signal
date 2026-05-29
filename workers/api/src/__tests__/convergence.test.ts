import { describe, expect, it, vi } from "vitest";
import app from "../index";

const fetcher = app as unknown as {
  fetch(request: Request, env?: Record<string, unknown>): Promise<Response>;
};

/** Minimal D1 mock — supports `.prepare().bind().all<T>()` like the real binding. */
function mockDb(results: Record<string, unknown[]>) {
  let lastSql = "";
  return {
    prepare: vi.fn((sql: string) => {
      lastSql = sql;
      return {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn(async () => ({
          results: lastSql.includes("ROW_NUMBER") ? results.recent ?? [] : results.summary ?? [],
        })),
      };
    }),
  };
}

const envWithDb = (db: ReturnType<typeof mockDb>) => ({
  DB: db as unknown as D1Database,
  ENVIRONMENT: "test",
});

describe("/convergence", () => {
  it("returns empty rows when DB has nothing in the window", async () => {
    const db = mockDb({ summary: [], recent: [] });
    const res = await fetcher.fetch(new Request("http://t/convergence"), envWithDb(db));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      windowHours: number;
      minSources: number;
      rows: unknown[];
    };
    expect(body.windowHours).toBe(24);
    expect(body.minSources).toBe(3);
    expect(body.rows).toEqual([]);
  });

  it("clamps `hours` and `min_sources` to safe ranges", async () => {
    const db = mockDb({ summary: [], recent: [] });
    const res = await fetcher.fetch(
      new Request("http://t/convergence?hours=999999&min_sources=50"),
      envWithDb(db),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { windowHours: number; minSources: number };
    // 999999 hours → clamped to 30 days = 720
    expect(body.windowHours).toBe(24 * 30);
    // 50 → clamped to 10
    expect(body.minSources).toBe(10);
  });

  it("returns shaped rows with attached recent events", async () => {
    const db = mockDb({
      summary: [
        {
          primary_entity_id: "AAPL",
          entity_name: "Apple Inc.",
          entity_ticker: "AAPL",
          entity_sector: "Information Technology",
          source_count: 4,
          event_count: 11,
          sources: "edgar_8k,news,reddit,market:polymarket",
          latest_at: 1700000000,
          earliest_at: 1699990000,
        },
      ],
      recent: [
        {
          primary_entity_id: "AAPL",
          source: "news",
          title: "Apple announces new chip",
          source_url: "https://example/a",
          published_at: 1700000000,
        },
        {
          primary_entity_id: "AAPL",
          source: "reddit",
          title: "AAPL discussion",
          source_url: "https://example/b",
          published_at: 1699999000,
        },
      ],
    });
    const res = await fetcher.fetch(new Request("http://t/convergence"), envWithDb(db));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      rows: Array<{
        entityId: string;
        ticker: string;
        sourceCount: number;
        sources: string[];
        recent: unknown[];
      }>;
    };
    expect(body.rows).toHaveLength(1);
    const row = body.rows[0];
    expect(row.entityId).toBe("AAPL");
    expect(row.ticker).toBe("AAPL");
    expect(row.sourceCount).toBe(4);
    expect(row.sources).toEqual([
      "edgar_8k",
      "news",
      "reddit",
      "market:polymarket",
    ]);
    expect(row.recent).toHaveLength(2);
  });

  it("respects custom min_sources", async () => {
    const db = mockDb({ summary: [], recent: [] });
    const res = await fetcher.fetch(
      new Request("http://t/convergence?min_sources=5&hours=48"),
      envWithDb(db),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { windowHours: number; minSources: number };
    expect(body.windowHours).toBe(48);
    expect(body.minSources).toBe(5);
  });
});
