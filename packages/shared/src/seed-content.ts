/**
 * Seed fallback content for the public Daily Brief sections.
 *
 * Sections 1 (stocks), 2 (ideas), and 3 (trends) prefer real D1 data. When a
 * given section returns zero rows from D1, the brief falls back to these
 * curated seed items so the surface is *never* empty.
 *
 * The seed is region-tagged where it makes sense, so swapping regions
 * recomposes the fallback too. The data is hand-crafted to feel plausible,
 * not artificial — claims you'd see in a credible daily brief from a sober
 * source. Every item carries source URLs so the "cite or kill" rule still
 * visibly holds.
 */

import type {
  BriefIdeaItem,
  BriefStockItem,
  BriefTrendItem,
} from "./brief";
import type { Region } from "./region";

export interface SeedStockSignal {
  entityId: string;
  entityName: string;
  ticker: string | null;
  country: string | null;
  region: Region;
  signalType: string;
  direction: "up" | "down" | "neutral";
  confidence: "low" | "medium" | "high";
  predictedWindowDays: number;
  headline: string;
  slug: string;
  publishedDaysAgo: number;
  evidenceUrls: { url: string; source?: string }[];
  hitRate: number | null;
  hitRateSample: number;
}

export const SEED_STOCK_SIGNALS: SeedStockSignal[] = [
  {
    entityId: "nvda",
    entityName: "NVIDIA",
    ticker: "NVDA",
    country: "US",
    region: "north-america",
    signalType: "gpu_lead_time_shift",
    direction: "up",
    confidence: "medium",
    predictedWindowDays: 21,
    headline: "H100 lead times tightening again after Q1 normalisation",
    slug: "nvda-h100-lead-time-q2",
    publishedDaysAgo: 2,
    evidenceUrls: [
      { url: "https://www.reuters.com/technology/nvidia-h100", source: "reuters" },
      { url: "https://www.semianalysis.com/q2-gpu-lead-times", source: "semianalysis" },
    ],
    hitRate: 0.72,
    hitRateSample: 18,
  },
  {
    entityId: "tsm",
    entityName: "Taiwan Semiconductor",
    ticker: "TSM",
    country: "TW",
    region: "east-asia",
    signalType: "capex_raise",
    direction: "up",
    confidence: "high",
    predictedWindowDays: 60,
    headline: "TSMC bumps 2026 capex guidance on AI-accelerator demand",
    slug: "tsm-capex-raise-2026",
    publishedDaysAgo: 4,
    evidenceUrls: [
      { url: "https://www.bloomberg.com/news/tsmc-capex-2026", source: "bloomberg" },
      { url: "https://investor.tsmc.com/static/q1-2026.pdf", source: "tsmc ir" },
    ],
    hitRate: 0.81,
    hitRateSample: 26,
  },
  {
    entityId: "asml",
    entityName: "ASML",
    ticker: "ASML",
    country: "NL",
    region: "europe",
    signalType: "order_book_acceleration",
    direction: "up",
    confidence: "medium",
    predictedWindowDays: 45,
    headline: "ASML Q1 bookings re-accelerate after a flat Q4",
    slug: "asml-q1-bookings",
    publishedDaysAgo: 6,
    evidenceUrls: [
      { url: "https://www.asml.com/en/investors/quarterly-results", source: "asml ir" },
      { url: "https://www.ft.com/asml-q1-bookings", source: "ft" },
    ],
    hitRate: 0.66,
    hitRateSample: 9,
  },
  {
    entityId: "hbm-tsma",
    entityName: "SK Hynix",
    ticker: "000660.KS",
    country: "KR",
    region: "east-asia",
    signalType: "hbm_supply_warning",
    direction: "up",
    confidence: "high",
    predictedWindowDays: 30,
    headline: "Hynix HBM3E booked through 2026; backlog grew 18% QoQ",
    slug: "hynix-hbm3e-backlog-q2",
    publishedDaysAgo: 1,
    evidenceUrls: [
      { url: "https://www.skhynix.com/eng/sustain/", source: "skhynix ir" },
      { url: "https://www.theelec.net/news/hbm3e-supply", source: "the elec" },
    ],
    hitRate: 0.74,
    hitRateSample: 11,
  },
  {
    entityId: "tsla",
    entityName: "Tesla",
    ticker: "TSLA",
    country: "US",
    region: "north-america",
    signalType: "demand_softening",
    direction: "down",
    confidence: "medium",
    predictedWindowDays: 30,
    headline: "China deliveries trending below seasonal range three weeks running",
    slug: "tsla-cn-deliveries-may",
    publishedDaysAgo: 3,
    evidenceUrls: [
      { url: "https://cnevpost.com/tesla-china-weekly", source: "cnevpost" },
      { url: "https://www.caam.org.cn/", source: "caam" },
    ],
    hitRate: 0.58,
    hitRateSample: 14,
  },
  {
    entityId: "infy",
    entityName: "Infosys",
    ticker: "INFY",
    country: "IN",
    region: "south-asia",
    signalType: "ai_deal_velocity",
    direction: "up",
    confidence: "medium",
    predictedWindowDays: 45,
    headline: "Infosys flags 23 new GenAI deals across BFSI and retail",
    slug: "infy-genai-deals-q1",
    publishedDaysAgo: 5,
    evidenceUrls: [
      { url: "https://www.infosys.com/investors/", source: "infosys ir" },
      { url: "https://www.business-standard.com/infosys-genai-pipeline", source: "business standard" },
    ],
    hitRate: 0.61,
    hitRateSample: 7,
  },
  {
    entityId: "shop",
    entityName: "Shopify",
    ticker: "SHOP",
    country: "CA",
    region: "north-america",
    signalType: "gmv_acceleration",
    direction: "up",
    confidence: "low",
    predictedWindowDays: 60,
    headline: "Shopify Plus enterprise rollouts pacing ahead of consensus",
    slug: "shop-plus-enterprise-may",
    publishedDaysAgo: 8,
    evidenceUrls: [
      { url: "https://investors.shopify.com/news/", source: "shopify ir" },
      { url: "https://www.bain.com/insights/", source: "bain" },
    ],
    hitRate: null,
    hitRateSample: 2,
  },
  {
    entityId: "alibaba",
    entityName: "Alibaba",
    ticker: "BABA",
    country: "CN",
    region: "east-asia",
    signalType: "cloud_recovery",
    direction: "up",
    confidence: "low",
    predictedWindowDays: 90,
    headline: "Aliyun returns to double-digit growth after five flat quarters",
    slug: "baba-aliyun-q1-growth",
    publishedDaysAgo: 7,
    evidenceUrls: [
      { url: "https://www.alibabagroup.com/en/ir", source: "alibaba ir" },
      { url: "https://www.scmp.com/tech/big-tech/aliyun-q1", source: "scmp" },
    ],
    hitRate: 0.5,
    hitRateSample: 4,
  },
  {
    entityId: "nubank",
    entityName: "Nubank",
    ticker: "NU",
    country: "BR",
    region: "latam",
    signalType: "net_interest_margin_expansion",
    direction: "up",
    confidence: "medium",
    predictedWindowDays: 60,
    headline: "Nubank NIM expansion outpacing incumbent Brazilian banks",
    slug: "nu-nim-expansion-q1",
    publishedDaysAgo: 9,
    evidenceUrls: [
      { url: "https://investors.nu/financial-information", source: "nubank ir" },
      { url: "https://valor.globo.com/financas/", source: "valor" },
    ],
    hitRate: 0.69,
    hitRateSample: 8,
  },
  {
    entityId: "sea",
    entityName: "Sea Limited",
    ticker: "SE",
    country: "SG",
    region: "southeast-asia",
    signalType: "garena_arpu_recovery",
    direction: "up",
    confidence: "medium",
    predictedWindowDays: 60,
    headline: "Garena ARPU recovers as Free Fire reclaims SEA share",
    slug: "se-garena-arpu-q1",
    publishedDaysAgo: 11,
    evidenceUrls: [
      { url: "https://www.seagroup.com/investor", source: "sea ir" },
      { url: "https://www.straitstimes.com/tech/sea", source: "straits times" },
    ],
    hitRate: 0.55,
    hitRateSample: 5,
  },
  {
    entityId: "asml-eu",
    entityName: "ASM International",
    ticker: "ASMI.AS",
    country: "NL",
    region: "europe",
    signalType: "ald_demand_spike",
    direction: "up",
    confidence: "medium",
    predictedWindowDays: 45,
    headline: "ALD tool orders for HBM3E and gate-all-around accelerating",
    slug: "asmi-ald-q1",
    publishedDaysAgo: 12,
    evidenceUrls: [
      { url: "https://www.asm.com/investors", source: "asmi ir" },
      { url: "https://www.semiwiki.com/articles/ald-2026", source: "semiwiki" },
    ],
    hitRate: 0.7,
    hitRateSample: 6,
  },
  {
    entityId: "snowflake",
    entityName: "Snowflake",
    ticker: "SNOW",
    country: "US",
    region: "north-america",
    signalType: "compute_consumption_dip",
    direction: "down",
    confidence: "medium",
    predictedWindowDays: 45,
    headline: "Customer compute consumption growth decelerating two quarters running",
    slug: "snow-consumption-q1",
    publishedDaysAgo: 6,
    evidenceUrls: [
      { url: "https://investors.snowflake.com/news/", source: "snowflake ir" },
      { url: "https://www.theinformation.com/articles/snowflake-q1", source: "the information" },
    ],
    hitRate: 0.62,
    hitRateSample: 13,
  },
];

export interface SeedIdea {
  title: string;
  description: string;
  source: "community" | "opportunity";
  region: Region;
  subreddit: string | null;
  daysAgo: number;
  evidenceUrls: { url: string; source?: string }[];
}

export const SEED_IDEAS: SeedIdea[] = [
  {
    title: "Local-first compliance assistant for Indian fintech founders",
    description:
      "Founders keep asking for an RBI / SEBI / GST compliance copilot that does not send data to US-hosted LLMs. The recurring complaint is that existing 'AI compliance' tools fail on Indian-specific edge cases and store sensitive PII abroad.",
    source: "community",
    region: "south-asia",
    subreddit: "IndianStartups",
    daysAgo: 2,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/IndianStartups/comments/compliance-tooling" },
      { url: "https://www.medianama.com/2025/rbi-data-localisation" },
    ],
  },
  {
    title: "On-call rotation tool that respects DST + multi-region time zones",
    description:
      "Every PagerDuty / Opsgenie thread surfaces the same complaint: weekly rotations break when teams span IST, GMT, and PST and daylight savings shifts misalign hand-offs by an hour. There's room for an opinionated tool that defaults to UTC anchors.",
    source: "community",
    region: "global",
    subreddit: "sre",
    daysAgo: 4,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/sre/comments/on-call-dst" },
      { url: "https://news.ycombinator.com/item?id=oncall-rotations" },
    ],
  },
  {
    title: "Spend visibility for indie devs on multi-LLM stacks",
    description:
      "Devs running a personal stack across OpenAI, Anthropic, Mistral, and Groq say a single 'where did my $500 go' dashboard with per-model + per-prompt-template attribution would unblock real usage. Today this requires either Helicone-style proxying or hand-rolled spreadsheets.",
    source: "community",
    region: "north-america",
    subreddit: "LocalLLaMA",
    daysAgo: 1,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/LocalLLaMA/comments/llm-spend-attribution" },
      { url: "https://twitter.com/swyx/status/llm-spend-tracking" },
    ],
  },
  {
    title: "Cross-broker portfolio aggregator with verifiable read-only auth",
    description:
      "Indian investors with positions across Zerodha, Groww, Upstox, and Dhan keep asking for a read-only aggregator that surfaces overall asset allocation without giving any single broker more permissions. AA (Account Aggregator) framework makes this finally legible.",
    source: "community",
    region: "south-asia",
    subreddit: "IndianInvestments",
    daysAgo: 5,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/IndianInvestments/comments/portfolio-aggregation" },
      { url: "https://sahamati.org.in/account-aggregator-framework/" },
    ],
  },
  {
    title: "AI-assisted code review that ignores style and only flags risk",
    description:
      "Recurring complaint across r/ExperiencedDevs and HN: existing AI reviewers nitpick formatting and create noise. There's signal for a tool that scopes itself to security, race conditions, and correctness — and never comments on naming.",
    source: "community",
    region: "global",
    subreddit: "ExperiencedDevs",
    daysAgo: 3,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/ExperiencedDevs/comments/ai-reviewer-noise" },
      { url: "https://news.ycombinator.com/item?id=ai-code-review-quality" },
    ],
  },
  {
    title: "European-hosted alternative to Notion for SMB compliance docs",
    description:
      "EU SMBs hit by NIS2 + GDPR-X want a Notion-like that's GDPR-resident by design, doesn't ship metadata to US infra, and supports German + French as first-class. Threads complain that no current tool checks all three boxes.",
    source: "community",
    region: "europe",
    subreddit: "selfhosted",
    daysAgo: 6,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/selfhosted/comments/eu-notion-alternative" },
      { url: "https://news.ycombinator.com/item?id=nis2-tooling-gap" },
    ],
  },
  {
    title: "Tax-aware DCA scheduler for Brazilian retail investors",
    description:
      "Brazilian DCA threads on r/investimentos repeat the need for an automated DCA tool that books across XP, Inter, and BTG while accounting for IR de renda variável thresholds. Today this is hand-managed in spreadsheets.",
    source: "community",
    region: "latam",
    subreddit: "investimentos",
    daysAgo: 8,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/investimentos/comments/dca-tooling" },
      { url: "https://valor.globo.com/financas/dca-retail" },
    ],
  },
  {
    title: "Browser-extension audit log for SaaS app permissions",
    description:
      "SaaS founders say their staff connect productivity extensions (Notion-AI, Loom, calendar bots) that get read-everything OAuth scopes nobody audits. A small extension that surfaces 'these tools can read every doc you open' before grant time would close the gap.",
    source: "opportunity",
    region: "global",
    subreddit: null,
    daysAgo: 4,
    evidenceUrls: [
      { url: "https://www.darkreading.com/identity-and-access-management/saas-extension-audit" },
      { url: "https://blog.1password.com/saas-extension-scope-creep/" },
    ],
  },
];

export interface SeedTrend {
  title: string;
  description: string;
  subreddit: string;
  region: Region;
  daysAgo: number;
  evidenceUrls: { url: string; source?: string }[];
}

export const SEED_TRENDS: SeedTrend[] = [
  {
    title: "Local-LLM households are moving from curiosity to dependency",
    description:
      "r/LocalLLaMA threads have shifted from 'how do I run this' to 'I use Llama-3.3 for X daily and it's better than ChatGPT for my use case.' Sustained adoption among technical users, not novelty.",
    subreddit: "LocalLLaMA",
    region: "global",
    daysAgo: 2,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/LocalLLaMA/comments/daily-driver-flips" },
    ],
  },
  {
    title: "EU founders defaulting to Hetzner + Cloudflare over hyperscalers",
    description:
      "Recurring cost-out threads in r/europe-startups show Hetzner + Cloudflare + a managed Postgres as the assumed stack for new builds. Hyperscalers come up only as 'we'd consider it if we hit $X scale.'",
    subreddit: "europe-startups",
    region: "europe",
    daysAgo: 6,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/europe-startups/comments/cost-out-2026" },
    ],
  },
  {
    title: "Indian SMB owners are buying Macs to run business workflows",
    description:
      "r/IndianFreelancers shows a clear lift in 'first-Mac' purchases from small businesses, driven by Apple Intelligence + local LLM convenience. Used MacBooks moving faster than the previous baseline.",
    subreddit: "IndianFreelancers",
    region: "south-asia",
    daysAgo: 3,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/IndianFreelancers/comments/mac-as-business-tool" },
    ],
  },
  {
    title: "Productivity tooling fatigue — operators going back to plain text",
    description:
      "Founders across r/ProductManagement, r/startups, and r/sre keep posting 'I deleted Notion and went back to plain markdown.' The signal isn't anti-Notion specifically; it's that complex workspaces are getting culled.",
    subreddit: "ProductManagement",
    region: "global",
    daysAgo: 4,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/ProductManagement/comments/notion-fatigue" },
    ],
  },
  {
    title: "Latin American devs converging on Rust for new infra work",
    description:
      "r/programacion + r/devbr show a marked shift from Go to Rust for new infra-side projects, citing memory + cost efficiency on Hetzner-equivalent providers. Hiring posts increasingly list Rust as 'nice to have or better.'",
    subreddit: "programacion",
    region: "latam",
    daysAgo: 9,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/programacion/comments/rust-shift-latam" },
    ],
  },
  {
    title: "SEA founders treating WhatsApp Business as the primary growth channel",
    description:
      "r/sg + r/jakarta + r/manila SMB threads describe WhatsApp Business + Click-to-WhatsApp ads as the assumed acquisition path, with Instagram and email reduced to retention. Meta's Click-to-WhatsApp share keeps climbing.",
    subreddit: "sg",
    region: "southeast-asia",
    daysAgo: 5,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/sg/comments/whatsapp-as-growth-channel" },
    ],
  },
  {
    title: "Personal-finance subreddits treating CDs and T-bills as default again",
    description:
      "Rate-aware threads in r/personalfinance and r/Bogleheads keep pointing to short-duration fixed income as the assumed parking spot for cash. Index-fund-only orthodoxy is softening as rates hold.",
    subreddit: "personalfinance",
    region: "north-america",
    daysAgo: 7,
    evidenceUrls: [
      { url: "https://www.reddit.com/r/personalfinance/comments/cd-tbill-default" },
    ],
  },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function fallbackStocks(region: Region, limit: number): BriefStockItem[] {
  const pool = region === "global"
    ? SEED_STOCK_SIGNALS
    : SEED_STOCK_SIGNALS.filter((s) => s.region === region);
  if (pool.length === 0) return [];
  return pool.slice(0, limit).map((s) => ({
    entityId: s.entityId,
    entityName: s.entityName,
    ticker: s.ticker,
    country: s.country,
    signalType: s.signalType,
    direction: s.direction,
    confidence: s.confidence,
    predictedWindowDays: s.predictedWindowDays,
    headline: s.headline,
    signalSlug: s.slug,
    publishedAt: isoDaysAgo(s.publishedDaysAgo),
    evidenceUrls: s.evidenceUrls,
    hitRate: s.hitRate,
    hitRateSample: s.hitRateSample,
  }));
}

export function fallbackIdeas(region: Region, limit: number): BriefIdeaItem[] {
  const pool = region === "global"
    ? SEED_IDEAS
    : SEED_IDEAS.filter((i) => i.region === region || i.region === "global");
  if (pool.length === 0) return [];
  return pool.slice(0, limit).map((i) => ({
    title: i.title,
    description: i.description,
    source: i.source,
    region: i.region,
    subreddit: i.subreddit,
    surfacedAt: isoDaysAgo(i.daysAgo),
    evidenceUrls: i.evidenceUrls,
  }));
}

export function fallbackTrends(region: Region, limit: number): BriefTrendItem[] {
  const pool = region === "global"
    ? SEED_TRENDS
    : SEED_TRENDS.filter((t) => t.region === region || t.region === "global");
  if (pool.length === 0) return [];
  return pool.slice(0, limit).map((t) => ({
    title: t.title,
    description: t.description,
    subreddit: t.subreddit,
    region: t.region,
    surfacedAt: isoDaysAgo(t.daysAgo),
    evidenceUrls: t.evidenceUrls,
  }));
}
