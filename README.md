# High Signal

High Signal is **one product**: a synthesized **Daily Brief** assembled from many noisy public sources. It covers three knowledge domains — **technology, startups, finance** — globally by default and filtered to any region a user picks.

The brief has five sections. The first three are public; the last two appear once the user connects a brand.

1. **Stocks watching for a boom** — hit-rate inline on every claim.
2. **Business ideas to build** — surfaced from community demand.
3. **New lifestyle trends** — community + cultural drift.
4. **How the market perceives your products** — mention intelligence.
5. **Ideas to improve your products** — agent-readiness gaps.

Everything else in the repo (Markets, Communities, Mentions, Agent Eval, Lab) is a **lens** — an intelligence helper that feeds the brief. They remain explorable as deep views but are no longer the product's headline.

Pricing: free. No paid tier, no billing. Region is a free filter.

## What it does today
- Ingests SEC filings, IR pages, AI-infra news/blogs, Reddit, GitHub, government feeds, YouTube transcripts, HKEX announcements, GDELT, and prediction markets
- Extracts events + entities + relationships
- Turns world-level changes and repeated app complaints into product opportunities under `/opportunities`
- Maps those opportunities onto the personal product graph under `/personal`
- Drafts daily signal candidates across low / medium / high confidence bands
- Predicts direction + 2nd-order spillover via supplier/customer/peer graph
- Publishes reviewed signal cards + weekly digest
- Auto-backtests every signal — public hit-rate ledger updated continuously

## Why the first market wedge still matters
- Small entity graph (~150 names) — tractable solo
- News-dense, retail-attentive, spillover-dominant alpha pattern (TSMC capex → ASML → HBM → cloud capex → power names)
- Existing incumbents (AlphaSense, Brightwave, Daloopa) own enterprise research workflows; nobody ships a directed spillover graph + public hit-rate
- Source layer is fully covered by OSS — no licensed feeds required for v0

## Status (2026-05-25)

- **Daily Brief** — primary surface at `/` and `/brief`. Worker route `/brief/daily?region=&owner=` composes the five sections from the lenses below. Region filter free for everyone; default global.
- **Markets lens** — functional. Ingest + signal log + review queue + public hit-rate ledger at `/track-record`. Feeds brief section 1 with inline hit-rate per signal type.
- **Communities lens** — functional. Tracked-subreddit CRUD, periodic digest generation (LLM summary when `HIGH_SIGNAL_AI_API_KEY` is set, deterministic fallback otherwise). Feeds brief sections 2 and 3.
- **Mentions lens** — UI + worker wired at `/mentions`. Real LLM checks fail-closed without `HIGH_SIGNAL_AI_API_KEY`; the local preview analyzer panel works regardless. Feeds brief section 4 (per connected brand).
- **Agent Eval lens** — deterministic 8-area evidence scorer + reel briefs at `/agent-eval`. Real-AI prompt execution overlays when the same key is set. Feeds brief section 5 (per connected brand).
- **Lab substrate** (plan `0007`) — Phase 1 expanded: docker-compose Postgres+pgvector, schema, HN ingest with outbound-link extraction, one-hop materialization, GitHub trending scraper, 4-factor scorer (HN + recency + velocity + GitHub-momentum placeholder), union-find story clustering, local sentence-transformer embeddings + semantic search, GLiNER entity extraction, local-LLM summarization (Ollama / vLLM), FastAPI feed at `/lab` with cluster-collapse toggle. Still pending from plan 0007: 14k-repo DB import, GitHub API enrichment for repos, GitHub-momentum factor in scorer.

For day-to-day stack and conventions, read `agents.md` (canonical).

## Will discuss: Signal Studio and playgrounds
**Signal Studio** is the recommended first playground: a visual content lab that turns High Signal findings into polished marketing assets. It should feel like a futuristic marketing command center, not a boring dashboard. It can be playground-quality visually while still producing assets useful for selling High Signal.

Inputs:
- Company URL
- Product positioning
- Competitor names
- High Signal audit findings
- One target buyer persona

Outputs:
- AI visibility audit snapshot
- Competitor comparison page
- LinkedIn carousel
- Short-form reel script
- Landing page teardown
- "Why we lose to competitor X" brief
- Launch announcement
- Weekly founder update

Other playgrounds worth adding:
- **AI SERP Theater** — show simulated buyer-agent searches visually: prompts enter, AI assistants answer, competitors appear/disappear, and citations light up. Strong demo surface for High Signal.
- **Competitor Roast Machine** — enter two SaaS sites and generate a brutal but useful comparison across positioning, trust, AI visibility, homepage clarity, pricing clarity, and content gaps. Fun, shareable, lead-gen friendly.
- **Launch Page Forge** — given a product idea, generate five landing page angles, a pricing page, comparison page, demo script, outbound emails, and social posts. Useful for the fleet and visually attractive.
- **Market Pulse Wall** — a live wall of signals: Reddit complaints, AI search mentions, GitHub trends, news, pricing changes, and founder posts. Potential High Signal "wow" screen.
- **Prompt-to-Campaign** — type a goal like "sell High Signal to devtool founders" and generate the campaign: ICP, message, landing section, posts, cold emails, ad concepts, and demo flow.

Worth folding into core High Signal:
- AI fact-checker / source surfacer
- Hyperlocal/community intelligence
- Market pulse / geo heatmap
- AI visibility / recommendation tracking
- Competitor monitoring

Worth playgrounding as marketing tools:
- Prompt-to-campaign generator
- Competitor roast/comparison machine
- AI SERP theater
- Launch page forge
- Signal-to-reel/carousel generator
- "Put in an idea, get the go/no-go brief"

## Architecture
```
apps/web              Next.js 16 + Tailwind v4 — futurist + clean UI, Clerk auth
workers/api           Hono on Cloudflare Workers + D1 binding + cron
packages/db           Drizzle schema + migrations (sqlite/D1) — signals, mentions,
                      communities, agent-eval, market quotes
packages/shared       Cross-package types + deterministic Agent-Eval scorer
python/ingest         uv-managed: edgartools, Trafilatura, GLiNER, FinBERT, yfinance
  └ GitHub Actions runs daily ingest, markets polling, and scoring
python/lab            Local-first Postgres substrate (plan 0007): pgvector,
                      HN ingest, GitHub trending, scorer, FastAPI feed
signals/              Git-versioned, append-only signal markdown
scripts/              CSV→D1 + signals.md→D1 sync
```

## Quickstart
```bash
# 1. Node deps
pnpm install

# 2. Python deps
cd python/ingest && uv sync && cd -

# 3. Cloudflare D1
wrangler d1 create high-signal-db        # paste the id into workers/api/wrangler.toml
pnpm db:migrate:local
pnpm db:seed:local                       # loads 274 entities + 175 relationships
pnpm product-flow:seed:local             # loads reviewed product-flow evidence for /ideas
pnpm personal:brief                      # prints the personal build/change/watch brief
pnpm personal:brief refresh-sources      # refreshes public product-flow evidence from tracked communities
pnpm personal:brief feedback high-signal-agent-evaluation build build "core direction"
pnpm personal:brief decide high-signal-agent-evaluation accepted build "turn this into next work"
pnpm personal:brief tasks                # prints SaaS Maker-ready task drafts from accepted actions
pnpm personal:brief sync-tasks           # dry-runs idempotent SaaS Maker task creation
pnpm personal:brief sync-tasks --apply   # creates missing accepted-action tasks via SaaS Maker
pnpm personal:brief report               # writes reports/personal/YYYY-MM-DD.md for weekly review

# 4. Env (.dev.vars + Modal Secret named `high-signal`)
#   AI_BASE_URL, AI_API_KEY, AI_MODEL
#   SEC_USER_AGENT="your-name your@email"

# 5. Dev
pnpm dev                                 # web (3000) + worker (8787)

# 6. Draft signals
cd python/ingest && uv run python -m high_signal_ingest.pipeline --source news --days 1

# 7. Review + publish
#   - open signals/<date>/<slug>.md
#   - flip review_status: published
#   - git commit
pnpm signals:sync:local

# 8. Optional: bring up the Lab substrate (plan 0007)
docker compose -f python/lab/docker-compose.yml up -d
cd python/lab && uv sync
uv run python -m high_signal_lab.ingest --limit 30           # HN + page text + outbound links
uv run python -m high_signal_lab.materialize --limit 50      # fetch one-hop linked pages
uv run python -m high_signal_lab.github_trending             # github.com/trending into repos
# Optional enrichment passes (each downloads its own model on first run):
uv sync --extra embeddings && uv run python -m high_signal_lab.embed
uv sync --extra entities && uv run python -m high_signal_lab.extract_entities
# Optional: point at any OpenAI-compatible endpoint (Ollama localhost:11434/v1 default):
uv run python -m high_signal_lab.summarize
uv run python -m high_signal_lab.cluster                     # story grouping (union-find)
uv run python -m high_signal_lab.score                       # 4-factor scoring
uv run python -m high_signal_lab.server                      # http://localhost:8765
# Then in the web app shell:
export LAB_API_URL=http://localhost:8765 && pnpm dev
```

## Quick links
- Spec: `SPEC.md`
- Commercial handoff: `docs/high-signal-handoff.md`
- Consolidation plan: `plans/0004-platform-consolidation.md`
- Plan: `plans/0001-research-artifact-first.md`
- Agent Evaluation plan: `plans/0006-agent-evaluation-attention-layer.md`
- Lab substrate plan: `plans/0007-highsignal-lab-substrate.md`
- Lab bring-up: `python/lab/README.md`
- Product opportunity radar: `/opportunities`
- Personal command brief: `/personal`
- Research: `research/market-and-oss.md`
- Stack + conventions: `agents.md`
- Seed corpus: `python/ingest/src/high_signal_ingest/seed/`
- Example signal: `signals/2026-04-25/example-nvda-h100-lead-time.md`
- Ingest runbook: `docs/ingest-runbook.md`
- Source coverage / launch scope: `docs/source-coverage.md`
- Seeding guide: `docs/seeding.md`

## Deploy
- Web → Cloudflare Workers via OpenNext (`.github/workflows/deploy-web.yml`)
- API → Cloudflare Workers (`.github/workflows/deploy-api.yml`)
- Ingest / markets / scoring → GitHub Actions cron
- Modal remains for manual long backfills (`cd python/ingest && uv run modal run modal_app.py::manual_backfill ...`)

## Naming
Codename `high-signal` collides with High Signal Labs / High Signal HQ. Final brand TBD post-traction.

<!-- ACTIVE-AI-TASK-LOG:START -->
## Active AI Task Log

This section is maintained by the SaaS Maker Active-AI product/design loop so future agents do not reopen duplicate UI tasks.

- Business lane: Core/status context
- Rule: do not create another broad "improve the UI" task unless the acceptance criteria differ materially from the tasks listed here.
- Source of truth for task status: SaaS Maker task board. README entries are durable context only.

- No current Active-AI product/design task from the 2026-05-25/26 loop. Treat this as watch/status unless new evidence appears.
<!-- ACTIVE-AI-TASK-LOG:END -->
