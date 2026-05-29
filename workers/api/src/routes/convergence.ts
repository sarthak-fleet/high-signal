/**
 * Cross-source convergence — entities hit by ≥N distinct sources in a rolling
 * window. Strongest pre-news pattern in the system: when news + Reddit + EDGAR
 * + IR fire on the same entity within hours, the signal is real.
 *
 * Pure SQL aggregation against the `events` table; no new ingest needed.
 */

import { Hono } from "hono";

type Env = { DB: D1Database };

interface ConvergenceRow {
  primary_entity_id: string | null;
  entity_name: string | null;
  entity_ticker: string | null;
  entity_sector: string | null;
  source_count: number;
  event_count: number;
  sources: string;            // comma-separated distinct sources
  latest_at: number;          // unix seconds
  earliest_at: number;        // unix seconds
}

interface RecentEvent {
  primary_entity_id: string;
  source: string;
  title: string | null;
  source_url: string;
  published_at: number;
}

export const convergenceRoute = new Hono<{ Bindings: Env }>();

convergenceRoute.get("/", async (c) => {
  // Bound inputs
  const hours = Math.min(Math.max(Number(c.req.query("hours") ?? 24), 1), 24 * 30);
  const minSources = Math.min(Math.max(Number(c.req.query("min_sources") ?? 3), 2), 10);
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 50), 1), 200);
  const since = Math.floor(Date.now() / 1000) - hours * 3600;

  // Top entities by distinct-source count in the window.
  const summary = (await c.env.DB.prepare(
    `SELECT
       e.primary_entity_id,
       ent.name      AS entity_name,
       ent.ticker    AS entity_ticker,
       ent.sector    AS entity_sector,
       COUNT(DISTINCT e.source) AS source_count,
       COUNT(*)                 AS event_count,
       GROUP_CONCAT(DISTINCT e.source) AS sources,
       MAX(e.published_at) AS latest_at,
       MIN(e.published_at) AS earliest_at
     FROM events e
     LEFT JOIN entities ent ON ent.id = e.primary_entity_id
     WHERE e.primary_entity_id IS NOT NULL
       AND e.published_at >= ?
     GROUP BY e.primary_entity_id
     HAVING COUNT(DISTINCT e.source) >= ?
     ORDER BY source_count DESC, event_count DESC, latest_at DESC
     LIMIT ?`,
  )
    .bind(since, minSources, limit)
    .all<ConvergenceRow>())
    .results ?? [];

  // Recent 3 event titles per entity in the window (for the brief callout).
  const entityIds = summary.map((r) => r.primary_entity_id).filter((x): x is string => Boolean(x));
  let recent: RecentEvent[] = [];
  if (entityIds.length > 0) {
    const placeholders = entityIds.map(() => "?").join(",");
    recent = (await c.env.DB.prepare(
      `SELECT primary_entity_id, source, title, source_url, published_at
       FROM (
         SELECT primary_entity_id, source, title, source_url, published_at,
                ROW_NUMBER() OVER (
                  PARTITION BY primary_entity_id
                  ORDER BY published_at DESC
                ) AS rn
         FROM events
         WHERE primary_entity_id IN (${placeholders})
           AND published_at >= ?
       )
       WHERE rn <= 3
       ORDER BY primary_entity_id, published_at DESC`,
    )
      .bind(...entityIds, since)
      .all<RecentEvent>())
      .results ?? [];
  }

  // Attach recent events to each summary row for the response.
  const recentByEntity = new Map<string, RecentEvent[]>();
  for (const ev of recent) {
    const list = recentByEntity.get(ev.primary_entity_id) ?? [];
    list.push(ev);
    recentByEntity.set(ev.primary_entity_id, list);
  }

  return c.json({
    generatedAt: new Date().toISOString(),
    windowHours: hours,
    minSources,
    rows: summary.map((row) => ({
      entityId: row.primary_entity_id,
      name: row.entity_name,
      ticker: row.entity_ticker,
      sector: row.entity_sector,
      sourceCount: row.source_count,
      eventCount: row.event_count,
      sources: (row.sources ?? "").split(",").filter(Boolean),
      latestAt: row.latest_at,
      earliestAt: row.earliest_at,
      recent: recentByEntity.get(row.primary_entity_id ?? "") ?? [],
    })),
  });
});
