import type { DailyBroadInsight } from "@/lib/daily-intelligence";
import type { LightweightDomain, LightweightSignalLayer, SignalContentCategory } from "@high-signal/shared";

export type DailyRequirementPriority = "critical" | "high" | "medium" | "low";

export type DailyRequirementItem = {
  id: string;
  title: string;
  summary: string;
  href: string;
  sourceLabel: string;
  contentCategory: SignalContentCategory;
  signalLayer: LightweightSignalLayer;
  domains: LightweightDomain[];
  intent: string;
  sentiment: string;
  priority: DailyRequirementPriority;
  score: number;
  painScore: number;
  buyerIntentScore: number;
  actionabilityScore: number;
  qualityScore: number;
  sourceCount: number;
  repeatedSignalCount: number;
  suggestedBuild: string;
  whyNow: string;
  nextStep: string;
};

const DOMAIN_BUILD: Partial<Record<LightweightDomain, string>> = {
  "agent-evaluation": "Agent-readiness evidence surface",
  consumer: "Consumer pressure radar",
  developer: "Developer workflow friction spec",
  market: "Market-regime watch note",
  operations: "Operations workflow requirement",
  regional: "Regional constraint tracker",
  "small-business": "Small-business operations artifact",
  startup: "Startup validation artifact",
};

function priorityFor(score: number): DailyRequirementPriority {
  if (score >= 78) return "critical";
  if (score >= 62) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function primaryDomain(item: DailyBroadInsight): LightweightDomain | null {
  return item.annotation.domains[0] ?? null;
}

function suggestedBuildFor(item: DailyBroadInsight) {
  const domain = primaryDomain(item);
  return domain ? DOMAIN_BUILD[domain] ?? "Source-linked validation artifact" : "Source-linked validation artifact";
}

function nextStepFor(item: DailyBroadInsight) {
  if (item.annotation.buyerIntentScore >= 0.5) {
    return "Create a small offer or comparison page and validate whether the buyer intent repeats tomorrow.";
  }
  if (item.annotation.actionabilityScore >= 0.67) {
    return "Convert the repeated requirement into a one-page spec with acceptance criteria and a manual validation path.";
  }
  if (item.annotation.painScore >= 0.34) {
    return "Collect two more examples of the pain and identify the current workaround before building.";
  }
  return "Keep watching until the requirement repeats with stronger pain, buyer intent, or implementation detail.";
}

function scoreFor(item: DailyBroadInsight) {
  const annotation = item.annotation;
  const score =
    annotation.actionabilityScore * 34 +
    annotation.buyerIntentScore * 28 +
    annotation.painScore * 18 +
    item.qualityScore * 0.16 +
    Math.min(item.repeatedSignalCount, 5) * 2;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function buildDailyRequirementQueue(insights: DailyBroadInsight[], limit = 12): DailyRequirementItem[] {
  return insights
    .filter((item) => item.annotation.productRequirement)
    .map((item) => {
      const score = scoreFor(item);
      const suggestedBuild = suggestedBuildFor(item);
      return {
        id: `requirement-${item.id}`,
        title: item.title,
        summary: item.summary,
        href: item.href,
        sourceLabel: item.sourceLabel,
        contentCategory: item.contentCategory,
        signalLayer: item.annotation.signalLayer,
        domains: item.annotation.domains,
        intent: item.intent,
        sentiment: item.sentiment,
        priority: priorityFor(score),
        score,
        painScore: item.annotation.painScore,
        buyerIntentScore: item.annotation.buyerIntentScore,
        actionabilityScore: item.annotation.actionabilityScore,
        qualityScore: item.qualityScore,
        sourceCount: item.sourceCount,
        repeatedSignalCount: item.repeatedSignalCount,
        suggestedBuild,
        whyNow: `${item.sourceLabel} produced a ${item.annotation.signalLayer.replaceAll("-", " ")} signal with ${item.sourceCount} underlying item(s), ${item.repeatedSignalCount} repeated product cue(s), and ${item.annotation.domains.join("/") || "no"} domain tag(s).`,
        nextStep: nextStepFor(item),
      };
    })
    .sort((a, b) => b.score - a.score || b.qualityScore - a.qualityScore || a.title.localeCompare(b.title))
    .slice(0, limit);
}
