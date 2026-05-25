/**
 * Daily Brief contract. The brief has 3 public sections plus 2 personal
 * sections that appear once a brand is connected.
 *
 * Each item carries enough metadata for the renderer to show evidence inline
 * (citations + hit-rate where applicable) without a second round-trip.
 */

import type { Region } from "./region";

export type BriefSectionKey =
  | "stocks"
  | "ideas"
  | "trends"
  | "perception"
  | "improvements";

export interface BriefCitation {
  url: string;
  source?: string | null;
}

export interface BriefStockItem {
  entityId: string;
  entityName: string;
  ticker: string | null;
  country: string | null;
  signalType: string;
  direction: "up" | "down" | "neutral";
  confidence: "low" | "medium" | "high";
  predictedWindowDays: number;
  headline: string;
  signalSlug: string;
  publishedAt: string;
  evidenceUrls: BriefCitation[];
  /**
   * Project's prior hit-rate on this signal type. Null = not enough scored
   * predictions yet. Inline in the UI per the moat principle.
   */
  hitRate: number | null;
  hitRateSample: number;
}

export interface BriefIdeaItem {
  title: string;
  description: string;
  source: "community" | "opportunity";
  region: Region;
  evidenceUrls: BriefCitation[];
  /** subreddit name when source='community', null otherwise. */
  subreddit: string | null;
  /** ISO date when this opportunity/digest was generated. */
  surfacedAt: string;
}

export interface BriefTrendItem {
  title: string;
  description: string;
  subreddit: string;
  region: Region;
  evidenceUrls: BriefCitation[];
  surfacedAt: string;
}

export interface BriefPerceptionItem {
  brandName: string;
  mentionRate: number | null;
  positiveShare: number | null;
  competitorPresence: number | null;
  latestCheckAt: string | null;
  configId: string;
}

export interface BriefImprovementItem {
  brandName: string;
  area: string;
  task: string;
  priority: "high" | "medium" | "low";
  auditId: string;
  surfacedAt: string;
}

export interface BriefSnapshot {
  generatedAt: string;
  region: Region;
  hasBrand: boolean;
  stocks: BriefStockItem[];
  ideas: BriefIdeaItem[];
  trends: BriefTrendItem[];
  perception: BriefPerceptionItem[];
  improvements: BriefImprovementItem[];
}

export const BRIEF_PUBLIC_SECTIONS: BriefSectionKey[] = ["stocks", "ideas", "trends"];
export const BRIEF_PERSONAL_SECTIONS: BriefSectionKey[] = ["perception", "improvements"];
