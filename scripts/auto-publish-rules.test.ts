#!/usr/bin/env tsx
/**
 * Unit tests for the auto-publish judge's deterministic rubric.
 *
 * Run: `pnpm signals:auto-publish:test`
 *
 * No vitest dependency — uses the in-tree tiny-runner pattern that the rest
 * of `scripts/*.test.ts` uses (sync-signals.test.ts, daily-range.test.ts).
 */

import {
  deterministicVerdict,
  isPredictionMarketOnly,
  type JudgeableSignal,
  type Verdict,
} from "./auto-publish-rules";

let failures = 0;
let total = 0;

function check(label: string, signal: JudgeableSignal, expected: Verdict, reasonContains?: string) {
  total++;
  const result = deterministicVerdict(signal);
  if (result.verdict !== expected) {
    failures++;
    console.error(
      `  ✗ ${label}: expected ${expected}, got ${result.verdict} (${result.reason})`,
    );
    return;
  }
  if (reasonContains && !result.reason.includes(reasonContains)) {
    failures++;
    console.error(
      `  ✗ ${label}: verdict ${expected} ok but reason "${result.reason}" missing "${reasonContains}"`,
    );
    return;
  }
  console.log(`  ✓ ${label}`);
}

function checkBool(label: string, actual: boolean, expected: boolean) {
  total++;
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}: expected ${expected}, got ${actual}`);
  }
}

console.log("auto-publish rubric — cite-or-kill floor");
check(
  "kill when zero evidence urls",
  { evidenceUrls: [], publishable: true, independentSourceCount: 5 },
  "kill",
  "cite-or-kill",
);
check(
  "kill when one evidence url",
  { evidenceUrls: ["https://example.com/a"], publishable: true, independentSourceCount: 5 },
  "kill",
  "cite-or-kill",
);

console.log("\nauto-publish rubric — prediction-market-only");
check(
  "kill when all urls are manifold",
  {
    evidenceUrls: [
      "https://manifold.markets/foo/will-x-happen",
      "https://manifold.markets/bar/will-y-happen",
    ],
    publishable: true,
    independentSourceCount: 1,
    sourceClasses: ["market"],
  },
  "kill",
  "prediction-market-only",
);
check(
  "kill when sourceClasses is only ['market']",
  {
    evidenceUrls: ["https://x.com/a", "https://y.com/b"],
    publishable: true,
    independentSourceCount: 1,
    sourceClasses: ["market"],
  },
  "kill",
  "prediction-market-only",
);
check(
  "kill mixed prediction-market domains",
  {
    evidenceUrls: [
      "https://manifold.markets/a",
      "https://polymarket.com/event/b",
      "https://kalshi.com/markets/c",
    ],
    publishable: true,
    independentSourceCount: 1,
  },
  "kill",
  "prediction-market-only",
);
check(
  "publish when one prediction market + one real news source",
  {
    evidenceUrls: ["https://manifold.markets/a", "https://reuters.com/foo"],
    publishable: true,
    independentSourceCount: 2,
    sourceClasses: ["market", "news"],
  },
  "publish",
);

console.log("\nauto-publish rubric — strongest case (both signals agree)");
check(
  "publish when publishable=true AND >=2 independent classes",
  {
    evidenceUrls: ["https://ir.foo.com", "https://reuters.com", "https://bloomberg.com"],
    publishable: true,
    independentSourceCount: 3,
    sourceClasses: ["ir", "news"],
  },
  "publish",
  "independent source classes",
);

console.log("\nauto-publish rubric — fallback drafts");
check(
  "kill fallback even with multiple urls",
  {
    evidenceUrls: ["https://a.com", "https://b.com", "https://c.com"],
    publishable: false,
    independentSourceCount: 1,
    qualityReasons: ["fallback_or_backfill"],
    sourceClasses: ["news"],
  },
  "kill",
  "fallback / backfill",
);

console.log("\nauto-publish rubric — escalation cases");
check(
  "hold when pipeline says ship but corroboration thin",
  {
    evidenceUrls: ["https://reuters.com/a", "https://bloomberg.com/b"],
    publishable: true,
    independentSourceCount: 1,
    sourceClasses: ["news"],
  },
  "hold",
  "escalate to AI",
);
check(
  "hold when corroborated but pipeline held back",
  {
    evidenceUrls: ["https://reuters.com/a", "https://ir.foo.com/b"],
    publishable: false,
    independentSourceCount: 2,
    sourceClasses: ["news", "ir"],
  },
  "hold",
  "pipeline held back",
);

console.log("\nauto-publish rubric — default kill");
check(
  "kill when neither pipeline blessed nor corroborated",
  {
    evidenceUrls: ["https://a.com", "https://b.com"],
    publishable: false,
    independentSourceCount: 1,
    sourceClasses: ["news"],
  },
  "kill",
  "neither pipeline blessing nor",
);

console.log("\nisPredictionMarketOnly");
checkBool("true for all manifold", isPredictionMarketOnly({
  evidenceUrls: ["https://manifold.markets/a", "https://manifold.markets/b"],
}), true);
checkBool("true for mixed prediction markets", isPredictionMarketOnly({
  evidenceUrls: ["https://manifold.markets/a", "https://www.polymarket.com/b"],
}), true);
checkBool("false when any non-market url present", isPredictionMarketOnly({
  evidenceUrls: ["https://manifold.markets/a", "https://reuters.com/b"],
}), false);
checkBool("false for empty urls", isPredictionMarketOnly({ evidenceUrls: [] }), false);
checkBool("false for malformed url", isPredictionMarketOnly({
  evidenceUrls: ["not a url"],
}), false);

console.log(`\nauto-publish-rules.test.ts: ${total - failures}/${total} passed`);
if (failures > 0) {
  console.error(`auto-publish-rules.test.ts: FAILED (${failures} failure${failures === 1 ? "" : "s"})`);
  process.exit(1);
}
console.log("auto-publish-rules.test.ts: ok");
