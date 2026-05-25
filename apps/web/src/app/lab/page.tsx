import {
  BackLink,
  FeedList,
  PageShell,
  Panel,
  SectionHeader,
  StatGrid,
} from "@/components/system/HighSignalUI";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lab Substrate — High Signal" };

export default async function LabPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; source?: string; cluster?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim();
  const source = (params.source ?? "").trim();
  const byCluster = params.cluster === "on";

  const feedResult = await Promise.allSettled([
    api.labFeed({ query, source, limit: 30, byCluster }),
  ]);
  const result = feedResult[0].status === "fulfilled" ? feedResult[0].value : null;
  const items = result?.items ?? [];
  const stats = result?.stats ?? null;

  return (
    <PageShell>
      <BackLink />
      <SectionHeader eyebrow="primary-source substrate" title="Lab">
        The shared discovery substrate beneath every sub-product. Local-first Postgres index over
        Hacker News, GitHub trending, engineering blogs, arXiv, and operator forums. Ranked,
        searchable, and feeding the curated signal layers above.
      </SectionHeader>

      <StatGrid
        items={[
          {
            label: "documents",
            value: stats ? stats.documents.toLocaleString() : "—",
            sub: "ingested primary-source docs",
          },
          {
            label: "sources",
            value: stats ? stats.sources.toString() : "—",
            sub: "feeds, repos, blogs, forums",
          },
          {
            label: "last ingest",
            value: stats?.lastIngestAt ? stats.lastIngestAt.slice(0, 16).replace("T", " ") : "—",
            sub: "UTC, refreshed by lab worker",
          },
          {
            label: "vector index",
            value: stats ? `${stats.embeddings.toLocaleString()}` : "—",
            sub: "pgvector embeddings",
          },
        ]}
      />

      <form className="mt-8 grid gap-3 border-y border-[var(--color-line)] py-4 md:grid-cols-[1fr_200px_auto_auto]">
        <label className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          search
          <input
            className="border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
            defaultValue={query}
            name="q"
            placeholder="hacker news, github trending, semantic..."
          />
        </label>
        <label className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          source
          <input
            className="border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
            defaultValue={source}
            name="source"
            placeholder="hn / hn-linked / one-hop"
          />
        </label>
        <label className="flex items-end gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          <input
            type="checkbox"
            name="cluster"
            value="on"
            defaultChecked={byCluster}
            className="size-4 accent-[var(--color-accent)]"
          />
          cluster
        </label>
        <button
          className="border border-[var(--color-line)] px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] md:self-end"
          type="submit"
        >
          search
        </button>
      </form>

      {!result ? (
        <Panel eyebrow="not provisioned" title="Lab substrate not running">
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            The Lab Postgres index has not been provisioned yet. Bring up the local stack with
            <code className="mx-1 border border-[var(--color-line)] px-1 py-0.5 text-xs">
              docker compose -f python/lab/docker-compose.yml up -d
            </code>
            then run
            <code className="mx-1 border border-[var(--color-line)] px-1 py-0.5 text-xs">
              uv run python -m high_signal_lab.ingest
            </code>
            to populate the index.
          </p>
        </Panel>
      ) : null}

      <FeedList
        eyebrow={`${byCluster ? "by cluster / " : ""}${query || source ? `results / ${items.length}` : `latest / ${items.length}`}`}
        empty="No documents in the Lab index match this query."
        items={items.map((item) => ({
          href: item.url,
          kicker: `${item.source} / score ${item.score.toFixed(2)}${
            item.clusterId ? ` / cluster ${item.clusterId.slice(0, 6)}` : ""
          } / ${item.publishedAt?.slice(0, 10) ?? "—"}`,
          title: item.title,
          body: item.summary ?? null,
        }))}
      />
    </PageShell>
  );
}
