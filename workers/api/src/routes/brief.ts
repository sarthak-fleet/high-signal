/**
 * Daily Brief route. The single composed surface for High Signal.
 *
 * GET /brief/daily?region=<region>&owner=<ownerId>
 *
 * - Three public sections (stocks / ideas / trends) compose without a user.
 * - Two personal sections (perception / improvements) compose only when an
 *   ownerId is supplied AND that owner has a connected brand.
 * - Everything filters by region when one is supplied; "global" or absent
 *   means no country filter.
 *
 * Hit-rate per stock signal type is computed from `score_runs` joined to
 * `signals` and inlined into each stock item.
 */

import { Hono } from "hono";
import { and, desc, eq, inArray, gte, sql } from "drizzle-orm";
import {
  countriesForRegion,
  fallbackIdeas,
  fallbackStocks,
  fallbackTrends,
  findSeedProduct,
  isRegion,
  normalizeCommunitySummary,
  SEED_PRODUCTS,
  type BriefIdeaItem,
  type BriefImprovementItem,
  type BriefPerceptionItem,
  type BriefSnapshot,
  type BriefStockItem,
  type BriefTrendItem,
  type Region,
  type SeedProduct,
} from "@high-signal/shared";
import { db, schema } from "../db";

type Env = { DB: D1Database };

export const STOCKS_LIMIT = 12;
export const IDEAS_LIMIT = 10;
export const TRENDS_LIMIT = 8;
/**
 * 4-week window. Sarthak's 2026-05-25 directive: "sync at least 4 weeks of
 * data everywhere." The brief reads from real D1 wherever it exists; seed
 * fallback only kicks in for the personal sections when nothing's available
 * for the picked product.
 */
export const RECENT_SIGNAL_WINDOW_DAYS = 28;
export const COMMUNITY_DIGEST_LOOKBACK_DAYS = 28;
export const HIT_RATE_SAMPLE_MIN = 3;

/** Pure ranking helper — tested directly. */
export interface RankableRow {
  direction: "up" | "down" | "neutral";
  confidence: "low" | "medium" | "high";
}
export function rankStocks<T extends RankableRow>(rows: T[]): T[] {
  const dirWeight = (d: string) => (d === "up" ? 0 : d === "down" ? 1 : 2);
  const confWeight = (c: string) => (c === "high" ? 0 : c === "medium" ? 1 : 2);
  return rows.slice().sort((a, b) => {
    const direction = dirWeight(a.direction) - dirWeight(b.direction);
    if (direction !== 0) return direction;
    return confWeight(a.confidence) - confWeight(b.confidence);
  });
}

/**
 * Compute hit-rate from a bag of outcomes, applying the sample-size gate.
 * Returns null when there are fewer than HIT_RATE_SAMPLE_MIN decided outcomes
 * (hit + miss). Push doesn't count toward the sample.
 */
export function computeHitRate(outcomes: { hit: number; miss: number; push: number }): {
  hitRate: number | null;
  sample: number;
} {
  const decided = outcomes.hit + outcomes.miss;
  if (decided < HIT_RATE_SAMPLE_MIN) {
    return { hitRate: null, sample: decided };
  }
  return { hitRate: outcomes.hit / decided, sample: decided };
}

/** Extract a one-line headline from a signal's body markdown, falling back to entity name. */
export function headlineFromBody(bodyMd: string, fallback: string): string {
  const firstLine = (bodyMd ?? "").split("\n").find((line) => line.trim());
  if (!firstLine) return fallback;
  return firstLine.replace(/^#+\s*/, "").trim().slice(0, 180) || fallback;
}

export const briefRoute = new Hono<{ Bindings: Env }>();

briefRoute.get("/daily", async (c) => {
  const rawRegion = c.req.query("region")?.toLowerCase().trim() ?? "global";
  const region: Region = isRegion(rawRegion) ? rawRegion : "global";
  const ownerId = c.req.query("owner")?.trim() ?? "";
  const productId = c.req.query("product")?.trim() ?? "";

  const database = db(c.env.DB);
  const countries = countriesForRegion(region);

  // Each section is independently fault-tolerant: a missing table, empty
  // result, or driver error degrades to seed fallback rather than failing
  // the whole brief. This keeps the daily-brief surface live even on a
  // fresh deploy where D1 hasn't been migrated/seeded yet.
  let [stocks, ideas, trends] = await Promise.all([
    safe(() => buildStocks(database, countries), "stocks"),
    safe(() => buildIdeas(database, region, countries), "ideas"),
    safe(() => buildTrends(database, region, countries), "trends"),
  ]);

  if (stocks.length === 0) stocks = fallbackStocks(region, STOCKS_LIMIT);
  if (ideas.length === 0) ideas = fallbackIdeas(region, IDEAS_LIMIT);
  if (trends.length === 0) trends = fallbackTrends(region, TRENDS_LIMIT);

  let perception: BriefPerceptionItem[] = [];
  let improvements: BriefImprovementItem[] = [];
  let hasBrand = false;

  // Priority 1: a real signed-in owner with their own brand data in D1.
  if (ownerId) {
    [perception, improvements] = await Promise.all([
      safe(() => buildPerception(database, ownerId), "perception"),
      safe(() => buildImprovements(database, ownerId), "improvements"),
    ]);
    hasBrand = perception.length > 0 || improvements.length > 0;
  }

  // Priority 2: an explicit product= seed selection (no auth needed). This is
  // the public demo path Sarthak called out — 30-40 seed products users can
  // switch between to see what sections 4 + 5 look like.
  if (!hasBrand && productId) {
    const seeded = renderFromSeed(productId);
    if (seeded) {
      perception = seeded.perception;
      improvements = seeded.improvements;
      hasBrand = true;
    }
  }

  // Priority 3: no owner, no product. Pick a rotating spotlight from the seed
  // so anonymous visitors still see populated sections instead of an empty
  // hint. Hour-based rotation so the spotlight feels alive.
  if (!hasBrand) {
    const spotlight = pickSpotlight(region);
    if (spotlight) {
      const seeded = renderFromSeed(spotlight.id);
      if (seeded) {
        perception = seeded.perception;
        improvements = seeded.improvements;
        hasBrand = true;
      }
    }
  }

  const snapshot: BriefSnapshot = {
    generatedAt: new Date().toISOString(),
    region,
    hasBrand,
    stocks,
    ideas,
    trends,
    perception,
    improvements,
  };
  return c.json(snapshot);
});

export function renderFromSeed(productId: string): {
  perception: BriefPerceptionItem[];
  improvements: BriefImprovementItem[];
} | null {
  const product = findSeedProduct(productId);
  if (!product) return null;
  return seedToBrief(product);
}

export function pickSpotlight(region: Region, nowMs: number = Date.now()): SeedProduct | null {
  const pool = region === "global"
    ? SEED_PRODUCTS
    : SEED_PRODUCTS.filter((p) => p.region === region);
  if (pool.length === 0) return null;
  const hourBucket = Math.floor(nowMs / (1000 * 60 * 60));
  return pool[hourBucket % pool.length] ?? null;
}

/**
 * Run a section builder and absorb any error (missing table, transient D1
 * outage, schema drift) — the brief route falls back to seed content when a
 * builder returns an empty array.
 */
async function safe<T>(builder: () => Promise<T[]>, section: string): Promise<T[]> {
  try {
    return await builder();
  } catch (error) {
    console.warn(`[brief] ${section} builder failed; falling back to seed`, error);
    return [];
  }
}

export function seedToBrief(product: SeedProduct, nowIso: string = new Date().toISOString()): {
  perception: BriefPerceptionItem[];
  improvements: BriefImprovementItem[];
} {
  return {
    perception: [
      {
        brandName: product.brandName,
        mentionRate: product.perception.mentionRate,
        positiveShare: product.perception.positiveShare,
        competitorPresence: product.perception.competitorPresence,
        latestCheckAt: nowIso,
        configId: `seed:${product.id}`,
      },
    ],
    improvements: product.improvements.map((improvement) => ({
      brandName: product.brandName,
      area: improvement.area,
      task: improvement.task,
      priority: improvement.priority,
      auditId: `seed:${product.id}`,
      surfacedAt: nowIso,
    })),
  };
}

async function buildStocks(
  database: ReturnType<typeof db>,
  countries: string[],
): Promise<BriefStockItem[]> {
  const sinceMs = Date.now() - RECENT_SIGNAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const sinceDate = new Date(sinceMs);

  const rows = await database
    .select({
      signalId: schema.signals.id,
      slug: schema.signals.slug,
      signalType: schema.signals.signalType,
      direction: schema.signals.direction,
      confidence: schema.signals.confidence,
      predictedWindowDays: schema.signals.predictedWindowDays,
      publishedAt: schema.signals.publishedAt,
      bodyMd: schema.signals.bodyMd,
      evidenceList: schema.signals.evidenceUrls,
      entityId: schema.entities.id,
      entityName: schema.entities.name,
      ticker: schema.entities.ticker,
      country: schema.entities.country,
    })
    .from(schema.signals)
    .innerJoin(schema.entities, eq(schema.entities.id, schema.signals.primaryEntityId))
    .where(
      and(
        eq(schema.signals.reviewStatus, "published"),
        gte(schema.signals.publishedAt, sinceDate),
        ...(countries.length
          ? [inArray(sql<string>`upper(${schema.entities.country})`, countries.map((c) => c.toUpperCase()))]
          : []),
      ),
    )
    .orderBy(desc(schema.signals.publishedAt))
    .limit(STOCKS_LIMIT * 4); // overfetch so the post-filter can rank by direction

  // Pull hit-rate stats for the signal types we just selected.
  const signalTypes = Array.from(new Set(rows.map((r) => r.signalType)));
  const hitRateBySignalType = await loadHitRateBySignalType(database, signalTypes);

  // Prefer up/down over neutral and high-confidence first within a type.
  const ranked = rankStocks(
    rows.map((r) => ({
      ...r,
      direction: r.direction as "up" | "down" | "neutral",
      confidence: r.confidence as "low" | "medium" | "high",
    })),
  ).slice(0, STOCKS_LIMIT);

  return ranked.map((row): BriefStockItem => {
    const headline = headlineFromBody(row.bodyMd, row.entityName);
    const evidenceArr = Array.isArray(row.evidenceList) ? row.evidenceList : [];
    const stats = hitRateBySignalType.get(row.signalType);
    const hitRateRendered =
      stats && stats.sample >= HIT_RATE_SAMPLE_MIN ? stats.hitRate : null;
    return {
      entityId: row.entityId,
      entityName: row.entityName,
      ticker: row.ticker,
      country: row.country,
      signalType: row.signalType,
      direction: row.direction as "up" | "down" | "neutral",
      confidence: row.confidence as "low" | "medium" | "high",
      predictedWindowDays: row.predictedWindowDays,
      headline,
      signalSlug: row.slug,
      publishedAt: row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : new Date(Number(row.publishedAt)).toISOString(),
      evidenceUrls: evidenceArr.map((url) => ({ url: String(url) })),
      hitRate: hitRateRendered,
      hitRateSample: stats?.sample ?? 0,
    };
  });
}

async function loadHitRateBySignalType(
  database: ReturnType<typeof db>,
  signalTypes: string[],
): Promise<Map<string, { hitRate: number; sample: number }>> {
  const map = new Map<string, { hitRate: number; sample: number }>();
  if (!signalTypes.length) return map;
  const rows = await database
    .select({
      signalType: schema.signals.signalType,
      outcome: schema.scoreRuns.outcome,
      count: sql<number>`count(*)`,
    })
    .from(schema.scoreRuns)
    .innerJoin(schema.signals, eq(schema.signals.id, schema.scoreRuns.signalId))
    .where(inArray(schema.signals.signalType, signalTypes))
    .groupBy(schema.signals.signalType, schema.scoreRuns.outcome);
  const buckets = new Map<string, { hit: number; miss: number; push: number }>();
  for (const r of rows) {
    const bucket = buckets.get(r.signalType) ?? { hit: 0, miss: 0, push: 0 };
    if (r.outcome === "hit") bucket.hit += Number(r.count);
    else if (r.outcome === "miss") bucket.miss += Number(r.count);
    else if (r.outcome === "push") bucket.push += Number(r.count);
    buckets.set(r.signalType, bucket);
  }
  for (const [signalType, b] of buckets) {
    const { hitRate, sample } = computeHitRate(b);
    // computeHitRate returns null when below the sample threshold; cache the
    // sample so the caller can still display "M scored calls" honestly.
    map.set(signalType, { hitRate: hitRate ?? 0, sample });
  }
  return map;
}

async function buildIdeas(
  database: ReturnType<typeof db>,
  region: Region,
  countries: string[],
): Promise<BriefIdeaItem[]> {
  const sinceMs = Date.now() - COMMUNITY_DIGEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  // Source A: community digests' key_action items across public digests.
  const digestRows = await database
    .select({
      id: schema.communityDigestSnapshots.id,
      subreddit: schema.communityDigestSnapshots.subreddit,
      snapshotDate: schema.communityDigestSnapshots.snapshotDate,
      summary: schema.communityDigestSnapshots.summary,
      summaryText: schema.communityDigestSnapshots.summaryText,
    })
    .from(schema.communityDigestSnapshots)
    .innerJoin(
      schema.trackedCommunities,
      eq(schema.trackedCommunities.id, schema.communityDigestSnapshots.trackedCommunityId),
    )
    .where(
      and(
        eq(schema.trackedCommunities.isPublic, true),
        gte(schema.communityDigestSnapshots.snapshotDate, new Date(sinceMs)),
      ),
    )
    .orderBy(desc(schema.communityDigestSnapshots.snapshotDate))
    .limit(60);

  const ideas: BriefIdeaItem[] = [];
  for (const digest of digestRows) {
    const summary = normalizeCommunitySummary(digest.summary);
    const action = summary?.keyAction;
    if (!action) continue;
    ideas.push({
      title: action.title,
      description: action.desc || digest.summaryText.slice(0, 240),
      source: "community",
      region,
      subreddit: digest.subreddit,
      surfacedAt: (digest.snapshotDate instanceof Date
        ? digest.snapshotDate
        : new Date(digest.snapshotDate as unknown as string)).toISOString(),
      evidenceUrls: action.link ? [{ url: action.link }] : [],
    });
    if (ideas.length >= IDEAS_LIMIT) break;
  }

  // Hint to the caller — countries are unused for ideas at present (digests
  // don't carry a region tag yet); accept the param for future tightening.
  void countries;

  return ideas;
}

async function buildTrends(
  database: ReturnType<typeof db>,
  region: Region,
  countries: string[],
): Promise<BriefTrendItem[]> {
  const sinceMs = Date.now() - COMMUNITY_DIGEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const digestRows = await database
    .select({
      id: schema.communityDigestSnapshots.id,
      subreddit: schema.communityDigestSnapshots.subreddit,
      snapshotDate: schema.communityDigestSnapshots.snapshotDate,
      summary: schema.communityDigestSnapshots.summary,
      summaryText: schema.communityDigestSnapshots.summaryText,
    })
    .from(schema.communityDigestSnapshots)
    .innerJoin(
      schema.trackedCommunities,
      eq(schema.trackedCommunities.id, schema.communityDigestSnapshots.trackedCommunityId),
    )
    .where(
      and(
        eq(schema.trackedCommunities.isPublic, true),
        gte(schema.communityDigestSnapshots.snapshotDate, new Date(sinceMs)),
      ),
    )
    .orderBy(desc(schema.communityDigestSnapshots.snapshotDate))
    .limit(40);

  const trends: BriefTrendItem[] = [];
  const seenSubs = new Set<string>();
  for (const digest of digestRows) {
    if (seenSubs.has(digest.subreddit)) continue; // one trend per subreddit per brief
    const summary = normalizeCommunitySummary(digest.summary);
    const trend = summary?.keyTrend;
    if (!trend) continue;
    trends.push({
      title: trend.title,
      description: trend.desc || digest.summaryText.slice(0, 240),
      subreddit: digest.subreddit,
      region,
      evidenceUrls: trend.link ? [{ url: trend.link }] : [],
      surfacedAt: (digest.snapshotDate instanceof Date
        ? digest.snapshotDate
        : new Date(digest.snapshotDate as unknown as string)).toISOString(),
    });
    seenSubs.add(digest.subreddit);
    if (trends.length >= TRENDS_LIMIT) break;
  }
  void countries;
  return trends;
}

async function buildPerception(
  database: ReturnType<typeof db>,
  ownerId: string,
): Promise<BriefPerceptionItem[]> {
  const configs = await database
    .select()
    .from(schema.mentionBrandConfigs)
    .where(eq(schema.mentionBrandConfigs.ownerId, ownerId))
    .orderBy(desc(schema.mentionBrandConfigs.updatedAt))
    .limit(4);

  if (!configs.length) return [];

  const out: BriefPerceptionItem[] = [];
  for (const config of configs) {
    const [latestCheck] = await database
      .select()
      .from(schema.mentionChecks)
      .where(
        and(eq(schema.mentionChecks.configId, config.id), eq(schema.mentionChecks.status, "completed")),
      )
      .orderBy(desc(schema.mentionChecks.createdAt))
      .limit(1);
    if (!latestCheck) continue;
    const results = await database
      .select()
      .from(schema.mentionResults)
      .where(eq(schema.mentionResults.checkId, latestCheck.id));
    const mentioned = results.filter((r) => r.brandMentioned);
    const positive = mentioned.filter((r) => r.brandSentiment === "positive").length;
    const competitorMentions = results.reduce((sum, r) => {
      const list = Array.isArray(r.competitorsMentioned) ? r.competitorsMentioned : [];
      return sum + list.filter((c) => c && typeof c === "object" && (c as { mentioned?: boolean }).mentioned).length;
    }, 0);
    out.push({
      brandName: config.brandName,
      mentionRate: latestCheck.brandMentionRate ?? (results.length ? mentioned.length / results.length : null),
      positiveShare: mentioned.length ? positive / mentioned.length : null,
      competitorPresence: results.length ? competitorMentions / results.length : null,
      latestCheckAt: (latestCheck.completedAt ?? latestCheck.createdAt)?.toISOString() ?? null,
      configId: config.id,
    });
  }
  return out;
}

async function buildImprovements(
  database: ReturnType<typeof db>,
  ownerId: string,
): Promise<BriefImprovementItem[]> {
  const auditRows = await database
    .select()
    .from(schema.agentEvaluationAudits)
    .where(eq(schema.agentEvaluationAudits.ownerId, ownerId))
    .orderBy(desc(schema.agentEvaluationAudits.createdAt))
    .limit(4);
  if (!auditRows.length) return [];

  const out: BriefImprovementItem[] = [];
  for (const audit of auditRows) {
    const tasks = await database
      .select()
      .from(schema.agentEvidenceTasks)
      .where(
        and(
          eq(schema.agentEvidenceTasks.auditId, audit.id),
          eq(schema.agentEvidenceTasks.status, "open"),
        ),
      )
      .orderBy(
        sql`CASE ${schema.agentEvidenceTasks.priority}
              WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
      )
      .limit(3);
    for (const task of tasks) {
      out.push({
        brandName: audit.brandName,
        area: task.area,
        task: task.title,
        priority: task.priority as "high" | "medium" | "low",
        auditId: audit.id,
        surfacedAt: audit.createdAt.toISOString(),
      });
      if (out.length >= 6) return out;
    }
  }
  return out;
}
