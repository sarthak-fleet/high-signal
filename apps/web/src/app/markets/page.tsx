import {
  BackLink,
  PageShell,
  Panel,
  RouteList,
  SectionHeader,
  StatGrid,
} from "@/components/system/HighSignalUI";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Market Intelligence — High Signal" };

export default async function MarketsPage() {
  await requireSignedIn();
  return (
    <PageShell>
      <BackLink />
      <SectionHeader eyebrow="market signal layer" title="Market Intelligence">
        High-level stock, company, and sector signals across national and international markets.
        The job is broad market awareness first, not deep single-stock research yet.
      </SectionHeader>

      <StatGrid
        items={[
          { label: "National", value: "India", sub: "public markets, sectors, policy, flows" },
          { label: "International", value: "Global", sub: "US, semis, AI infra, macro spillovers" },
          { label: "Depth", value: "High level", sub: "watch, flag, compare; no deep dives yet" },
        ]}
      />

      <section className="mt-10 grid gap-8 md:grid-cols-3">
        <Panel eyebrow="scope" title="Stock watch">
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Track national and international names at a high level: what changed, who is affected,
            direction, confidence, and whether it matters enough to watch.
          </p>
        </Panel>
        <Panel eyebrow="constraint" title="No deep dive yet">
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Avoid full analyst reports, valuation models, and company-by-company research until the
            signal pipeline and hit-rate are more mature.
          </p>
        </Panel>
        <Panel eyebrow="connection" title="Product impact">
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Market changes should also feed product opportunities when they imply budget shifts,
            new constraints, new buyer urgency, or app requirements.
          </p>
        </Panel>
      </section>

      <RouteList
        items={[
          { href: "/signals", title: "signals", sub: "published and draft-aware feed" },
          { href: "/entities", title: "entities", sub: "company and sector graph" },
          { href: "/sectors", title: "sectors", sub: "market pressure by category" },
          { href: "/digest", title: "digest", sub: "weekly rollup" },
        ]}
      />
    </PageShell>
  );
}
