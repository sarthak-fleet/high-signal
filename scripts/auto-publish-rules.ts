/**
 * Pure helpers for the auto-publish judge, extracted from
 * `scripts/auto-publish-drafts.ts` so they can be unit-tested without
 * importing the script's side-effects (fetch, env reads, process.exit).
 */

export type Verdict = "publish" | "kill" | "hold";

export interface VerdictResult {
  verdict: Verdict;
  reason: string;
  source: "ai" | "rule";
}

export interface JudgeableSignal {
  evidenceUrls: string[];
  publishable?: boolean;
  independentSourceCount?: number;
  qualityReasons?: string[];
  sourceClasses?: string[];
}

/**
 * Domains whose presence alone — without corroboration from a news, IR, SEC,
 * blog, or regulator source — is crowd opinion, not new information.
 */
export const PREDICTION_MARKET_DOMAINS = [
  "manifold.markets",
  "polymarket.com",
  "kalshi.com",
  "metaculus.com",
];

export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isPredictionMarketOnly(signal: JudgeableSignal): boolean {
  const urls = signal.evidenceUrls ?? [];
  if (urls.length === 0) return false;
  return urls.every((u) => {
    const host = urlHost(u);
    return PREDICTION_MARKET_DOMAINS.some((domain) => host.endsWith(domain));
  });
}

/**
 * Deterministic rubric. See script header for policy rationale.
 */
export function deterministicVerdict(signal: JudgeableSignal): VerdictResult {
  const evidence = signal.evidenceUrls?.length ?? 0;
  const independent = signal.independentSourceCount ?? 0;
  const reasons = signal.qualityReasons ?? [];
  const classes = signal.sourceClasses ?? [];

  if (evidence < 2) {
    return {
      verdict: "kill",
      reason: `only ${evidence} evidence url(s) — fails cite-or-kill`,
      source: "rule",
    };
  }

  if (
    isPredictionMarketOnly(signal) ||
    (classes.length === 1 && classes[0] === "market")
  ) {
    return {
      verdict: "kill",
      reason: "prediction-market-only — crowd opinion, not new information",
      source: "rule",
    };
  }

  if (signal.publishable === true && independent >= 2) {
    return {
      verdict: "publish",
      reason: `pipeline blessed AND ${independent} independent source classes`,
      source: "rule",
    };
  }

  if (reasons.includes("fallback_or_backfill")) {
    return {
      verdict: "kill",
      reason: "fallback / backfill draft — pipeline flagged low confidence",
      source: "rule",
    };
  }

  if (signal.publishable === true && independent < 2) {
    return {
      verdict: "hold",
      reason: "pipeline blessed but thin corroboration — escalate to AI",
      source: "rule",
    };
  }

  if (independent >= 2 && signal.publishable === false) {
    return {
      verdict: "hold",
      reason: `${independent} independent classes but pipeline held back — escalate to AI`,
      source: "rule",
    };
  }

  return {
    verdict: "kill",
    reason: "neither pipeline blessing nor independent corroboration",
    source: "rule",
  };
}
