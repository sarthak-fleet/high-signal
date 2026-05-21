import {
  BackLink,
  CommandButton,
  FeedList,
  Field,
  MetricGrid,
  PageShell,
  Panel,
  SectionHeader,
  StatGrid,
} from "@/components/system/HighSignalUI";
import { api } from "@/lib/api";
import {
  type CommunitySummaryItem,
  normalizeCommunitySummary,
  redditSourceLink,
} from "@high-signal/shared";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community Intelligence — High Signal" };

const sampleSummary = normalizeCommunitySummary({
  key_trend: {
    title: "Open-model teams want operational visibility",
    desc: "Threads cluster around monitoring, routing, and evaluation pain as local LLM usage moves from experiments into production workflows.",
    sourceId: ["samplepost1"],
  },
  notable_discussions: [
    {
      title: "Teams compare agent orchestration tools",
      desc: "The recurring signal is not model quality alone; users want confidence, provenance, and repeatable workflow state.",
      sourceId: ["samplepost2", "samplecomment1"],
    },
    {
      title: "Cost controls are becoming product requirements",
      desc: "Community comments repeatedly mention budget ceilings, caching, and observability before deploying agent workflows.",
      sourceId: ["samplepost3"],
    },
  ],
  key_action: {
    title: "Key Action",
    desc: "Package community intelligence around tracked prompts, source-linked summaries, and alertable operational changes.",
    sourceId: ["samplepost2"],
  },
});

const sampleSummaryItems: CommunitySummaryItem[] = sampleSummary
  ? [sampleSummary.keyTrend, ...sampleSummary.notableDiscussions, sampleSummary.keyAction].filter(
      (item): item is CommunitySummaryItem => Boolean(item),
    )
  : [];

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ subreddit?: string; q?: string }>;
}) {
  await requireSignedIn();
  const params = (await searchParams) ?? {};
  const subreddit = (params.subreddit ?? "LocalLLaMA").replace(/^r\//i, "").trim();
  const query = (params.q ?? "AI agents").trim();
  const [communityResult, mentionsResult] = await Promise.allSettled([
    api.redditCommunity(subreddit),
    api.redditMentions(query, 8),
  ]);
  const community = communityResult.status === "fulfilled" ? communityResult.value.community : null;
  const mentions = mentionsResult.status === "fulfilled" ? mentionsResult.value.mentions : [];

  return (
    <PageShell>
      <BackLink />
      <SectionHeader eyebrow="community signal layer" title="Community Intelligence">
        Subreddit and forum signals for pain, demand, narrative shifts, product opportunities, and
        competitor mentions. This surface will absorb AgentMode's Reddit workflow.
      </SectionHeader>

      <StatGrid
        items={[
          { label: "Source repo", value: "agentMode", sub: "Reddit fetcher + snapshots" },
          { label: "Primary object", value: "community", sub: "subreddits, prompts, digests" },
          { label: "First migration", value: "tracked subreddits", sub: "source-linked summaries" },
        ]}
      />

      <section className="mt-10 grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="subreddit lookup">
          <form>
            <Field label="Subreddit" name="subreddit" defaultValue={subreddit} />
            <Field label="Mention query" name="q" defaultValue={query} />
            <CommandButton>refresh</CommandButton>
          </form>
        </Panel>

        <Panel eyebrow="live reddit source">
          {community ? (
            <>
              <a className="mt-5 block text-2xl font-medium hover:text-[var(--color-accent)]" href={community.url}>
                r/{community.name}
              </a>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {community.description || community.title}
              </p>
              <MetricGrid
                items={[
                  { label: "subs", value: community.subscribers.toLocaleString() },
                  { label: "active", value: community.activeUsers?.toLocaleString() ?? "unknown" },
                  { label: "nsfw", value: community.nsfw ? "yes" : "no" },
                ]}
              />
            </>
          ) : (
            <p className="mt-5 text-sm text-[var(--color-muted)]">Reddit source unavailable.</p>
          )}
        </Panel>
      </section>

      <FeedList
        eyebrow="mention search"
        empty="No Reddit mentions returned for this query."
        items={mentions.map((mention) => ({
          href: mention.permalink,
          kicker: `r/${mention.subreddit} / ${mention.type} / score ${mention.score}`,
          title: mention.title || mention.body || "Untitled mention",
          body: mention.selftext,
        }))}
      />

      {sampleSummaryItems.length > 0 ? (
        <section className="mt-10 grid gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
          {sampleSummaryItems.map((item) => {
            const link = redditSourceLink(subreddit, item.sourceId) ?? item.link ?? "#";
            return (
              <a
                key={`${item.title}-${link}`}
                href={link}
                className="bg-[var(--color-bg)] p-5 hover:text-[var(--color-accent)]"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  source-linked digest
                </div>
                <h2 className="mt-5 text-lg font-medium tracking-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{item.desc}</p>
              </a>
            );
          })}
        </section>
      ) : null}
    </PageShell>
  );
}
