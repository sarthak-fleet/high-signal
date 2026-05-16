import {
  BackLink,
  CommandButton,
  Field,
  MetricGrid,
  PageShell,
  Panel,
  SectionHeader,
  StatGrid,
} from "@/components/system/HighSignalUI";
import { analyzeMentionVisibility } from "@high-signal/shared";
import { requireSignedIn } from "@/lib/require-auth";

export const metadata = { title: "Mention Intelligence — High Signal" };

const sampleText =
  "1. High Signal is a reliable way to track market and community signals. 2. Brandwatch is broader for social listening. See https://highsignal.ai for the product. Teams also ask for source-linked market signal tools and AI visibility monitoring.";

const promptOpportunities = [
  {
    prompt: "best tools for source-linked market intelligence",
    volume: "high",
    intent: "category discovery",
    status: "owned answer gap",
  },
  {
    prompt: "alternatives to brandwatch for AI visibility",
    volume: "medium",
    intent: "competitive switch",
    status: "competitor present",
  },
  {
    prompt: "how to track citations in AI search answers",
    volume: "medium",
    intent: "workflow pain",
    status: "citation gap",
  },
];

const citationSources = [
  { source: "owned docs", domain: "highsignal.ai", signal: "brand cited" },
  { source: "third-party lists", domain: "comparison pages", signal: "missing" },
  { source: "community threads", domain: "reddit / hn", signal: "watch" },
];

export default async function MentionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ brand?: string; url?: string; text?: string }>;
}) {
  await requireSignedIn();
  const params = (await searchParams) ?? {};
  const brandName = (params.brand ?? "High Signal").trim();
  const brandUrl = (params.url ?? "https://highsignal.ai").trim();
  const text = (params.text ?? sampleText).trim();
  const analysis = analyzeMentionVisibility({
    text,
    brandName,
    brandUrl,
    competitors: [{ name: "Brandwatch" }, { name: "G2" }],
  });

  return (
    <PageShell>
      <BackLink />
      <SectionHeader eyebrow="company signal layer" title="Mention Intelligence">
        Company, brand, competitor, AI visibility, citation, and share-of-voice signals. This
        surface will absorb the useful Mentionpilot workflows.
      </SectionHeader>

      <StatGrid
        items={[
          { label: "Source repo", value: "mentionpilot", sub: "configs, checks, reports" },
          { label: "Primary object", value: "company", sub: "aliases, URL, competitors" },
          { label: "First migration", value: "AI visibility", sub: "prompt checks + analysis" },
        ]}
      />

      <section className="mt-10 grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="visibility analyzer">
          <form>
            <Field label="Brand" name="brand" defaultValue={brandName} />
            <Field label="Brand URL" name="url" defaultValue={brandUrl} />
            <Field label="Model response" name="text" defaultValue={text} multiline />
            <CommandButton>analyze</CommandButton>
          </form>
        </Panel>

        <Panel eyebrow="extracted mentionpilot logic">
          <MetricGrid
            items={[
              ["mentioned", analysis.brandMentioned ? "yes" : "no"],
              ["sentiment", analysis.brandSentiment ?? "none"],
              ["position", analysis.brandPosition?.toString() ?? "none"],
              ["brand cited", analysis.brandCited ? "yes" : "no"],
            ].map(([label, value]) => ({ label, value }))}
          />
          <div className="mt-6 border-t border-[var(--color-line)] pt-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              competitors
            </div>
            <div className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
              {analysis.competitorsMentioned.map((competitor) => (
                <div key={competitor.name} className="flex justify-between gap-6">
                  <span>{competitor.name}</span>
                  <span>{competitor.mentioned ? `position ${competitor.position ?? "unknown"}` : "not found"}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-8 grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="prompt demand" title="AI query opportunities">
          <div className="mt-5 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {promptOpportunities.map((opportunity) => (
              <div key={opportunity.prompt} className="py-4">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                  <span className="text-[var(--color-accent)]">{opportunity.volume}-volume</span>
                  <span className="text-[var(--color-muted)]">{opportunity.intent}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-fg)]">
                  {opportunity.prompt}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  {opportunity.status}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="citation surface" title="Source gap queue">
          <div className="mt-5 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {citationSources.map((source) => (
              <div key={source.source} className="flex items-center justify-between gap-5 py-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {source.source}
                  </div>
                  <div className="mt-2 text-sm text-[var(--color-fg)]">{source.domain}</div>
                </div>
                <span
                  className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    source.signal === "brand cited"
                      ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "border-[var(--color-line)] text-[var(--color-muted)]"
                  }`}
                >
                  {source.signal}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
            Prioritize prompts where competitors appear and High Signal lacks a cited source.
          </p>
        </Panel>
      </section>
    </PageShell>
  );
}
