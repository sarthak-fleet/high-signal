/**
 * Gazetteer-expansion triage: events landing with no entity match in the
 * last N hours, with $TICKER tokens extracted + ranked by mention count.
 *
 * Use case: when an event hits but `primary_entity_id IS NULL`, the entity
 * isn't in `ai_infra_entities.csv` yet. The top tokens here are candidates
 * to add to the gazetteer.
 */

import { Hono } from "hono";

type Env = { DB: D1Database };

interface UnmappedEvent {
  title: string | null;
  content: string | null;
  source: string;
  source_url: string;
  published_at: number;
}

interface Candidate {
  token: string;
  count: number;
  sources: string[];
  samples: Array<{
    title: string;
    source: string;
    source_url: string;
    published_at: number;
  }>;
}

const TICKER_RE = /\$[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g;
const STOP_TOKENS = new Set(["$USD", "$EUR", "$GBP", "$JPY"]);

/** Extract distinct $TICKER tokens from a title (and optionally content). */
export function extractTickerTokens(title: string, content?: string | null): string[] {
  const text = `${title} ${content ?? ""}`;
  const matches = text.match(TICKER_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (STOP_TOKENS.has(m)) continue;
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

/** Aggregate per-token counts + source-source set + sample events. */
export function aggregateCandidates(events: UnmappedEvent[], maxSamples = 3): Candidate[] {
  const byToken = new Map<
    string,
    { count: number; sources: Set<string>; samples: Candidate["samples"] }
  >();
  for (const ev of events) {
    const title = ev.title ?? "";
    const tokens = extractTickerTokens(title, ev.content);
    for (const token of tokens) {
      let entry = byToken.get(token);
      if (!entry) {
        entry = { count: 0, sources: new Set(), samples: [] };
        byToken.set(token, entry);
      }
      entry.count += 1;
      entry.sources.add(ev.source);
      if (entry.samples.length < maxSamples) {
        entry.samples.push({
          title,
          source: ev.source,
          source_url: ev.source_url,
          published_at: ev.published_at,
        });
      }
    }
  }
  return Array.from(byToken.entries())
    .map(([token, info]) => ({
      token,
      count: info.count,
      sources: Array.from(info.sources).sort(),
      samples: info.samples,
    }))
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token));
}

export const unmappedRoute = new Hono<{ Bindings: Env }>();

unmappedRoute.get("/", async (c) => {
  const hours = Math.min(Math.max(Number(c.req.query("hours") ?? 24), 1), 24 * 30);
  const eventLimit = Math.min(Math.max(Number(c.req.query("limit") ?? 500), 1), 2000);
  const candidateLimit = Math.min(Math.max(Number(c.req.query("top") ?? 30), 1), 200);
  const since = Math.floor(Date.now() / 1000) - hours * 3600;

  const events = (await c.env.DB.prepare(
    `SELECT title, content, source, source_url, published_at
     FROM events
     WHERE primary_entity_id IS NULL
       AND title IS NOT NULL
       AND published_at >= ?
     ORDER BY published_at DESC
     LIMIT ?`,
  )
    .bind(since, eventLimit)
    .all<UnmappedEvent>())
    .results ?? [];

  const candidates = aggregateCandidates(events).slice(0, candidateLimit);

  return c.json({
    generatedAt: new Date().toISOString(),
    windowHours: hours,
    eventsScanned: events.length,
    candidates,
  });
});
