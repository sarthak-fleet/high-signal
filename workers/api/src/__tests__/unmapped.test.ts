import { describe, expect, it, vi } from "vitest";
import app from "../index";
import { aggregateCandidates, extractTickerTokens } from "../routes/unmapped";

const fetcher = app as unknown as {
  fetch(request: Request, env?: Record<string, unknown>): Promise<Response>;
};

function mockDb(events: unknown[]) {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn(async () => ({ results: events })),
    })),
  };
}

const envWithDb = (db: ReturnType<typeof mockDb>) => ({
  DB: db as unknown as D1Database,
  ENVIRONMENT: "test",
});


// ─── pure helpers ─────────────────────────────────────────────────────────


describe("extractTickerTokens", () => {
  it("extracts $TICKER patterns", () => {
    expect(extractTickerTokens("$NVDA gains on AI demand")).toEqual(["$NVDA"]);
    expect(extractTickerTokens("$AAPL and $MSFT both up today")).toEqual(["$AAPL", "$MSFT"]);
  });

  it("dedupes within a single title", () => {
    expect(extractTickerTokens("$NVDA $NVDA $NVDA")).toEqual(["$NVDA"]);
  });

  it("supports exchange-suffixed tickers", () => {
    expect(extractTickerTokens("$BRK.B class B shares")).toEqual(["$BRK.B"]);
  });

  it("strips currency-like stop tokens", () => {
    expect(extractTickerTokens("$USD weakens vs $EUR")).toEqual([]);
  });

  it("returns empty for text with no $TICKER", () => {
    expect(extractTickerTokens("nothing to see here, just normal prose")).toEqual([]);
  });

  it("includes content if provided", () => {
    expect(extractTickerTokens("title only", "and $TSLA in the body")).toEqual(["$TSLA"]);
  });
});


describe("aggregateCandidates", () => {
  const ev = (
    title: string,
    source = "news",
    source_url = "https://example/",
    published_at = 1700000000,
  ) => ({ title, content: null, source, source_url, published_at });

  it("counts mentions per token across events", () => {
    const got = aggregateCandidates([
      ev("$NVDA up"),
      ev("$NVDA earnings beat"),
      ev("$AAPL announces new chip"),
      ev("$NVDA partners"),
    ]);
    const byToken = Object.fromEntries(got.map((c) => [c.token, c.count]));
    expect(byToken["$NVDA"]).toBe(3);
    expect(byToken["$AAPL"]).toBe(1);
  });

  it("sorts by count desc then token asc", () => {
    const got = aggregateCandidates([
      ev("$ZZZ"),
      ev("$ZZZ"),
      ev("$AAA"),
      ev("$AAA"),
      ev("$AAA"),
      ev("$BBB"),
    ]);
    expect(got.map((c) => c.token)).toEqual(["$AAA", "$ZZZ", "$BBB"]);
  });

  it("collects distinct sources per token", () => {
    const got = aggregateCandidates([
      ev("$XYZ", "news"),
      ev("$XYZ", "reddit"),
      ev("$XYZ", "news"),
    ]);
    expect(got[0].sources).toEqual(["news", "reddit"]);
  });

  it("caps samples per token", () => {
    const got = aggregateCandidates(
      Array.from({ length: 10 }, (_, i) => ev(`$ABC #${i}`, "news")),
      2,
    );
    expect(got[0].samples).toHaveLength(2);
  });
});


// ─── route ────────────────────────────────────────────────────────────────


describe("/unmapped", () => {
  it("returns empty when there are no unmapped events", async () => {
    const res = await fetcher.fetch(
      new Request("http://t/unmapped"),
      envWithDb(mockDb([])),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { candidates: unknown[]; eventsScanned: number };
    expect(body.candidates).toEqual([]);
    expect(body.eventsScanned).toBe(0);
  });

  it("ranks candidates from mock events", async () => {
    const events = [
      { title: "$NVDA at ATH", content: null, source: "news", source_url: "x", published_at: 1700000000 },
      { title: "$NVDA earnings", content: null, source: "reddit", source_url: "x", published_at: 1700000001 },
      { title: "$ASML guidance", content: null, source: "edgar_8k", source_url: "x", published_at: 1700000002 },
    ];
    const res = await fetcher.fetch(
      new Request("http://t/unmapped"),
      envWithDb(mockDb(events)),
    );
    const body = (await res.json()) as {
      eventsScanned: number;
      candidates: Array<{ token: string; count: number }>;
    };
    expect(body.eventsScanned).toBe(3);
    expect(body.candidates[0]).toEqual(
      expect.objectContaining({ token: "$NVDA", count: 2 }),
    );
    expect(body.candidates[1]).toEqual(
      expect.objectContaining({ token: "$ASML", count: 1 }),
    );
  });

  it("clamps query params to safe ranges", async () => {
    const res = await fetcher.fetch(
      new Request("http://t/unmapped?hours=99999&top=99999&limit=99999"),
      envWithDb(mockDb([])),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { windowHours: number };
    expect(body.windowHours).toBe(24 * 30);
  });
});
