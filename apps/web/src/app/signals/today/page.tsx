import { api, type SignalRow } from "@/lib/api";
import { isBackfillSignal } from "@/lib/signal-format";
import { SignalCard } from "@/components/molecules/SignalCard";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assessSignalQuality,
  communityDigestEvidenceQuality,
  type CommunityDigestSnapshot,
  type SignalContentCategory,
} from "@high-signal/shared";
import sourceRegistry from "../../../../../../data/personal-source-registry.json";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Today — High Signal",
  description:
    "Signals published in the last 24 hours, sorted by confidence. The morning-coffee surface for analysts who only have time for the freshest reads.",
};

const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const CATEGORY_LABELS: Record<SignalContentCategory, string> = {
  "ai-infra": "AI infra",
  "market-pulse": "market pulse",
  "product-opportunity": "product opportunities",
  "customer-complaint": "customer complaints",
  "startup-move": "startup moves",
  "regional-issue": "regional issues",
  "agent-evaluation": "agent evaluation",
  "policy-regulatory": "policy / regulatory",
  "company-event": "company events",
};
const DATA_ROOT = resolve(process.cwd(), "../../data");

type SourceRegistry = {
  sources: Array<{
    id: string;
    type: "reddit" | "hacker-news" | "github-issues" | "rss";
    label: string;
    target: string;
    period: "day" | "week" | "month";
    intent: string;
  }>;
};

type ProductFlowRefreshRecord = {
  source: "reddit" | "hacker-news" | "github-issues" | "rss";
  sourceId?: string;
  label?: string;
  target?: string;
  period: "day" | "week" | "month";
  digest: CommunityDigestSnapshot;
  createdAt: string;
};

function utcDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function safeDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : utcDate();
}

function signalCategory(signal: SignalRow): SignalContentCategory {
  return (
    signal.contentCategory ??
    assessSignalQuality({
      signalType: signal.signalType,
      confidence: signal.confidence,
      evidenceUrls: signal.evidenceUrls,
      bodyMd: signal.bodyMd,
    }).contentCategory
  );
}

function signalQuality(signal: SignalRow) {
  return assessSignalQuality({
    signalType: signal.signalType,
    confidence: signal.confidence,
    evidenceUrls: signal.evidenceUrls,
    bodyMd: signal.bodyMd,
  });
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

async function readSourceRefreshes(): Promise<ProductFlowRefreshRecord[]> {
  try {
    const raw = await readFile(resolve(DATA_ROOT, "product-flow-refresh.jsonl"), "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ProductFlowRefreshRecord);
  } catch {
    return [];
  }
}

function latestRefreshRecords(records: ProductFlowRefreshRecord[]) {
  const latest = new Map<string, ProductFlowRefreshRecord>();
  for (const record of records) {
    const key = `${record.sourceId ?? record.label ?? record.target ?? record.source}:${record.period}`.toLowerCase();
    const previous = latest.get(key);
    if (!previous || record.digest.snapshotDate > previous.digest.snapshotDate) latest.set(key, record);
  }
  return Array.from(latest.values());
}

function acceptedRefreshRecords(records: ProductFlowRefreshRecord[]) {
  return latestRefreshRecords(records).filter((record) => {
    const quality = communityDigestEvidenceQuality(record.digest);
    return record.digest.sourceCount >= 2 && quality.genericRisk !== "high" && quality.repeatedSignalCount >= 2;
  });
}

export default async function SignalsTodayPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedDate = safeDate(params.date);
  const selectedCategory = (params.category || "") as SignalContentCategory | "";
  let all: SignalRow[] = [];
  try {
    const r = await api.signals({ date: selectedDate, limit: 200 });
    all = r.signals.filter((signal) => !isBackfillSignal(signal));
  } catch {
    /* offline */
  }

  const today = all
    .filter((s) => !selectedCategory || signalCategory(s) === selectedCategory)
    .sort((a, b) => {
      const c = (CONFIDENCE_RANK[a.confidence] ?? 9) - (CONFIDENCE_RANK[b.confidence] ?? 9);
      if (c !== 0) return c;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  const categories = countBy(all.map((signal) => signalCategory(signal)));
  const quality = today.map(signalQuality);
  const sourceClasses = countBy(quality.flatMap((item) => item.sourceClasses));
  const usable = quality.filter((item) => item.publishable).length;
  const strong = quality.filter((item) => item.band === "strong").length;
  const evidenceCount = today.reduce((sum, signal) => sum + signal.evidenceUrls.length, 0);
  const registry = sourceRegistry as SourceRegistry;
  const refreshes = await readSourceRefreshes();
  const acceptedRefreshes = acceptedRefreshRecords(refreshes);
  const configuredByType = countBy(registry.sources.map((source) => source.type));
  const acceptedByType = countBy(acceptedRefreshes.map((record) => record.source));
  const latestSnapshot = acceptedRefreshes
    .map((record) => record.digest.snapshotDate)
    .sort()
    .at(-1);
  const underlyingItems = acceptedRefreshes.reduce((sum, record) => sum + record.digest.sourceCount, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <a
        href="/signals"
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
      >
        ← all signals
      </a>
      <header className="mt-3 border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-medium tracking-tight">Daily</h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {selectedDate} · {today.length} item{today.length === 1 ? "" : "s"}
        </p>
      </header>

      <form className="mt-6 grid gap-3 border-y border-zinc-800 py-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          date
          <input
            className="border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--color-accent)]"
            defaultValue={selectedDate}
            name="date"
            type="date"
          />
        </label>
        <label className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          kind
          <select
            className="border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--color-accent)]"
            defaultValue={selectedCategory}
            name="category"
          >
            <option value="">all</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="border border-zinc-800 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] sm:self-end"
          type="submit"
        >
          load
        </button>
      </form>

      <section className="mt-6 grid gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-4">
        {[
          ["usable", `${usable}/${today.length}`],
          ["strong", strong.toString()],
          ["evidence", evidenceCount.toString()],
          ["sources", sourceClasses.map(([k, n]) => `${k} ${n}`).join(" / ") || "none"],
        ].map(([label, value]) => (
          <div key={label} className="bg-black p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {label}
            </div>
            <div className="mt-3 break-words font-mono text-sm text-zinc-200">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 border-y border-zinc-800 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          source coverage
        </div>
        <div className="mt-4 grid gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-4">
          {[
            ["configured", registry.sources.length.toString()],
            ["accepted", acceptedRefreshes.length.toString()],
            ["underlying items", underlyingItems.toString()],
            ["latest refresh", latestSnapshot?.slice(0, 10) ?? "none"],
          ].map(([label, value]) => (
            <div key={label} className="bg-black p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {label}
              </div>
              <div className="mt-3 break-words font-mono text-sm text-zinc-200">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 text-xs leading-6 text-zinc-500 sm:grid-cols-2">
          <div>
            <div className="font-mono uppercase tracking-[0.18em] text-zinc-600">configured</div>
            <div className="mt-1 font-mono">
              {configuredByType.map(([type, count]) => `${type} ${count}`).join(" / ")}
            </div>
          </div>
          <div>
            <div className="font-mono uppercase tracking-[0.18em] text-zinc-600">accepted latest</div>
            <div className="mt-1 font-mono">
              {acceptedByType.map(([type, count]) => `${type} ${count}`).join(" / ") || "none"}
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <nav className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <a
            className={`border px-2.5 py-1 ${!selectedCategory ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-zinc-800 text-zinc-500 hover:text-zinc-200"}`}
            href={`/signals/today?date=${selectedDate}`}
          >
            all {all.length}
          </a>
          {categories.map(([category, count]) => (
            <a
              className={`border px-2.5 py-1 ${selectedCategory === category ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-zinc-800 text-zinc-500 hover:text-zinc-200"}`}
              href={`/signals/today?date=${selectedDate}&category=${category}`}
              key={category}
            >
              {(CATEGORY_LABELS[category as SignalContentCategory] ?? category).toLowerCase()} {count}
            </a>
          ))}
        </nav>
      ) : null}

      {today.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">
          Nothing for this date/filter. Check the weekly{" "}
          <a href="/digest" className="text-[var(--color-accent)] hover:underline">
            digest
          </a>{" "}
          instead.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {today.map((s) => (
            <SignalCard key={s.slug} s={s} />
          ))}
        </ul>
      )}
    </main>
  );
}
