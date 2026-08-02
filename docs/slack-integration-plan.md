# Delphi ↔ Slack Integration — Implementation Plan

**Status:** Proposed (no code changes yet)
**Branch:** `claude/delphi-slack-integration-p48ev2`
**Date:** 2026-08-02

---

## 1. Concept

Connect Delphi to Slack so that:

- **Each question becomes a channel.** `/delphi Should we adopt X?` creates `#delphi-should-we-adopt-x`, invites the asker, and starts a run.
- **Each persona is a visible participant.** Expert responses post under the persona's own name and avatar, so the channel reads like a genuine panel deliberation — experts, contrarians, and cross-examinations included.
- **Personas and humans interact.** The panel @-mentions the question owner when input is needed; humans steer the deliberation between rounds by replying in the channel (this maps directly onto the engine's existing guided mode).
- **The final report lands in the channel** as a Block Kit summary plus downloadable Markdown/JSON artifacts, after which the channel can be archived.

---

## 2. Current architecture — research findings

These findings drive the design and the backward-compatibility strategy.

### 2.1 Engine (`src/`)

- `DelphiAgent.runDelphiProcess()` (`src/main.ts:117`) runs the full pipeline: question refinement → decomposition → prior-analysis lookup → persona generation → N rounds (web research → parallel expert responses → synthesis → contrarian challenges → cross-examination → convergence check) → final report + post-consensus pipeline.
- **All progress reporting is `console.log`.** There is no structured event stream. The REST API (`src/api.ts:67-74`) monkey-patches `console.log`/`console.warn` during a run to fill a per-process `liveLogs` buffer for SSE.
- **Guided mode already exists** (`src/main.ts:283-294`, `setGuidedMode` at `:1848`): after each round the engine awaits an async callback `(roundNumber, synthesis) => Promise<string | null>`; a non-null return is appended to the prompt context as "Human Guidance". Today only the CLI wires this up (`src/cli.ts:180`). **The callback is in-process memory** — whatever answers it must run in the same process as the engine.
- Personas are rich (`PersonaSpec` in `src/utils/persona-generator.ts:12`): `name`, `role`, `epistemic_stance`, background, `communication_style`, etc. `ExpertResponse` (`src/types/index.ts:40`) carries `agent_id`, `position`, `reasoning`, `confidence` (1–10), and cited `sources`. `CrossExamination` (`src/types/index.ts:253`) carries examiner/respondent roles, `challenge`, and `response` — ready-made dialogue.
- BYOK is supported via `runWithApiKey()` (AsyncLocalStorage, `src/llm/invoke.ts:18`).
- Models: Anthropic for agents/search, OpenAI for embeddings only.

### 2.2 API and consumers

- `POST /api/v1/analyze` starts a run in-process (`setImmediate`), persists via the runs repo, optionally fires a completion webhook. `GET /api/v1/runs/:id`, `GET /api/v1/runs`, `GET /api/v1/health`.
- **The SSE endpoint `GET /api/v1/runs/:id/stream` has zero consumers.** No `EventSource` exists anywhere in the repo. The Next.js dashboard polls `GET /api/session/:id` every 3 s and shows a purely time-based progress bar. ⇒ We can add a structured event layer without touching any consumer contract.

### 2.3 Web app (`apps/web`)

- Next.js 14 App Router. Talks to the engine only through a server-side proxy (`app/lib/engine-proxy.ts`): `startRun` → `POST /api/v1/analyze`, `getRun` → `GET /api/v1/runs/:id`. Reads run lists directly from Supabase. Auth is Supabase magic link.
- Nothing in `apps/web` needs to change for the Slack integration.

### 2.4 Storage

- `RunsRepo` (`src/server/runs-repo.ts`): `create/update/get/list/failInterrupted`, backed by Supabase (`public.runs`) in the hosted deployment, in-memory otherwise. `failInterrupted()` flips **all** pending/running rows to `error` on engine boot.
- A second abstraction (`src/storage/`) handles reports/trackers/retrospectives; on Supabase it's mostly a no-op because the API layer owns the `runs` row.
- Migrations `0001`–`0007` define `runs`, `signal_trackers`, `retrospectives`, `user_keys` (plaintext BYOK keys), admin policies.

### 2.5 Deployment (`render.yaml`)

- Two Render services: `delphi-engine` (Express, **`numInstances: 1`**, runs execute in-process) and `delphi-web` (Next.js). Secrets in the `delphi-secrets` env group.
- ⚠️ Pre-existing gap (not caused by, and not to be fixed silently by, this work): root `npm run build` runs `vite build` (legacy SPA → `dist-web/`), yet the engine `startCommand` is `node dist/api.js`. There is no committed script that produces `dist/`. See Risks (§9).

### 2.6 Tests / CI

- One test file, `src/tests/basic.test.ts` (schema validation, convergence tracker basics; several placeholder assertions). `npm test` runs vitest in **watch** mode. No CI. `apps/web` has no tests.

### 2.7 Slack platform constraints (verified Aug 2026)

- **Persona posting:** `chat.postMessage` with `username` / `icon_url` / `icon_emoji` overrides requires the [`chat:write.customize`](https://docs.slack.dev/reference/scopes/chat.write.customize/) scope. Messages are still bot messages — personas are *styled*, not real users, so they cannot themselves be @-mentioned. They **can** @-mention real users (`<@U123>` in text).
- **Rate limits:** since [May 2025](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/), non-Marketplace apps get ~**1 request/minute and 15 objects** on `conversations.history` / `conversations.replies`. ⇒ The design must be **fully event-driven** (Slack pushes messages to us); we never poll channel history. `chat.postMessage` remains ~1 msg/sec/channel — expert responses arrive in parallel bursts, so posting needs a per-channel throttled queue.
- **File uploads:** `files.upload` is sunset; use `files.uploadV2` (`files:write` scope).
- **Framework:** `@slack/bolt` v4 (Node ≥ 18). Supports an `ExpressReceiver` (mount routes into an existing Express app) for production HTTP events, and Socket Mode for local dev without a public URL.
- Channel names: ≤ 80 chars, lowercase, `a-z0-9-_` only, must be unique per workspace (including archived channels).

---

## 3. Key design decisions

### D1 — Slack service lives *inside* the engine process (recommended)

Mount Bolt's `ExpressReceiver` router into the existing Express app in `src/api.ts` (`/slack/events`, `/slack/commands`, `/slack/interactions`), rather than deploying a separate service.

Why:
- **Guided mode requires it.** The round-pause callback is an in-process promise. If Slack handling ran in another service, resuming a paused run would need cross-service IPC or DB polling. In-process, the Slack message handler simply resolves the waiting promise.
- The engine is already `numInstances: 1` with in-process runs, so this adds no new scaling constraint.
- No new Render service, no new deploy surface; the feature is dead code unless `SLACK_BOT_TOKEN` + `SLACK_SIGNING_SECRET` are set.

Trade-off: if the engine is ever scaled horizontally, both run execution *and* Slack event routing need a shared-state redesign — that constraint already exists today for runs.

### D2 — Typed event layer, additive and optional

Add a `DelphiEventEmitter` that the engine calls at each milestone, **alongside** (not instead of) the existing `console.log` lines. CLI output, the log-capture SSE, and every current behaviour remain byte-identical. Slack subscribes to events; nothing else has to.

### D3 — Personas post via `chat:write.customize`; avatars are stance emoji in v1

Each expert message posts with `username: "Dr. Amara Okafor — Implementation Realist"` and an `icon_emoji` mapped from `epistemic_stance` (e.g. 🛡️ status_quo_defender, 🔬 methodology_skeptic, 🔧 implementation_realist, ⚖️ ethics_maximalist, 😈 contrarian_challenger, 📚 evidence_synthesizer; 🎯 for contrarians, 🧭 for the Moderator). Generated avatar images (hosted in Supabase Storage, passed as `icon_url`) are a later polish item.

### D4 — Channel-per-question, threads-per-round

- Top-level channel messages: kickoff, panel introduction, one "Round N" header per round, guided-mode prompts, final report. Everything verbose (individual expert responses, contrarian challenges, cross-examinations) goes in a **thread under the round header**, keeping the channel skimmable.
- Channel auto-archives (optional, default on) after the report posts. Name: `delphi-<slug>-<4char>` — the random suffix avoids collisions with archived channels.

### D5 — Human steering = guided mode, event-driven

Slack-initiated runs enable guided mode. After each round the Moderator posts: synthesis summary + *"Reply in this thread to steer the panel, or react ✅ to continue. Continuing automatically in 15 minutes."* The guided callback resolves on the first qualifying reply / ✅ reaction / timeout. Replies posted *during* a round are buffered and injected at the next pause. All handled via Events API (`message.channels`, `reaction_added`) — no history polling.

### D6 — v1 auth & keys: workspace-level

Runs started from Slack use the engine's env `ANTHROPIC_API_KEY` (same as CLI). Mapping Slack users → Supabase users → BYOK keys is out of scope for v1 (noted in §10 Future work). A per-workspace daily run cap (`DELPHI_SLACK_DAILY_RUN_LIMIT`, default 5) bounds spend.

---

## 4. Slack app configuration

**Scopes (bot token):** `commands`, `chat:write`, `chat:write.customize`, `channels:manage`, `channels:read`, `files:write`, `reactions:read`, `users:read`
**Events (bot):** `message.channels`, `reaction_added`, `member_joined_channel`, `app_mention`
**Slash command:** `/delphi <question>` with optional flags `--experts N` (3–10) `--rounds N` (1–5) `--no-guided`
**Receivers:** production = HTTP (`https://<engine-host>/slack/events`); local dev = Socket Mode (`SLACK_APP_TOKEN`).
An `app-manifest.yaml` will be committed under `slack/` so the app can be recreated from source.

New env vars (all optional — absence disables the whole feature):

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...            # Socket Mode, local dev only
DELPHI_SLACK_DAILY_RUN_LIMIT=5
DELPHI_SLACK_GUIDED_TIMEOUT_MIN=15
DELPHI_SLACK_ARCHIVE_ON_COMPLETE=true
```

---

## 5. New engine event layer (Phase 1)

New file `src/events.ts`:

```ts
export type DelphiEvent =
  | { type: 'run_started'; question: string; experts: number; maxRounds: number }
  | { type: 'phase'; name: 'question_analysis' | 'decomposition' | 'prior_analysis'
                         | 'research' | 'personas' | 'synthesis' | 'post_consensus'; detail?: string }
  | { type: 'personas_generated'; personas: PersonaSpec[] }
  | { type: 'round_started'; round: number; maxRounds: number }
  | { type: 'expert_response'; round: number; persona: PersonaSpec; response: ExpertResponse }
  | { type: 'expert_failed'; round: number; role: string; error: string }
  | { type: 'round_synthesis'; round: number; synthesis: RoundSynthesis }
  | { type: 'contrarian_challenge'; round: number; index: number; response: ContrarianResponse }
  | { type: 'cross_examination'; round: number; exam: CrossExamination }
  | { type: 'convergence_update'; round: number; converged: boolean; stableDivergence: boolean }
  | { type: 'guided_pause'; round: number; synthesis: RoundSynthesis }
  | { type: 'guided_resume'; round: number; humanInput: string | null }
  | { type: 'report_ready'; report: DelphiReport }
  | { type: 'run_error'; error: string };

export type DelphiEventHandler = (event: DelphiEvent) => void; // errors swallowed, never awaited
```

Wiring into `DelphiAgent` — **strictly additive**:

- New private field `eventHandler?: DelphiEventHandler` + public `setEventHandler(h)` (mirrors the existing `setGuidedMode` pattern).
- A private `emit(event)` that no-ops when unset and wraps the handler in try/catch so a subscriber bug can never fail a run.
- Emit call sites in `src/main.ts` (next to existing logs, which stay): run start `:121`, phases `:134/:153/:170`, personas `:208`, round start `:226`, cross-exam `:251`, convergence `:273-280`, guided pause/resume `:284-294`, completion `:333`, error `:339`; and in `executeRoundWithValidation`: per-expert response `:538`, expert failure `:544`, synthesis `:569`, contrarian `:592`.
- The per-expert emit lives inside the existing parallel `Promise.all` — events fire as each expert finishes, giving Slack a natural "experts replying one by one" cadence.

**Compatibility guarantees:** no existing method signature changes; no behaviour change when no handler is set; `console.log` output identical, so CLI display and the API's `liveLogs`/SSE capture are untouched.

Bonus (optional, still additive): `src/api.ts` may also register a handler that appends structured JSON frames to `liveLogs`, giving the currently-unused SSE endpoint semantic events for a future web UI upgrade. Not required for Slack.

---

## 6. Slack module (Phases 2–5)

New directory `src/slack/`, only imported when configured:

```
src/slack/
  index.ts        # createSlackApp(): Bolt App + ExpressReceiver; export router or null
  config.ts       # env parsing; isSlackEnabled()
  commands.ts     # /delphi handler: parse flags, ack fast, create channel, start run
  run-bridge.ts   # starts DelphiAgent with event handler + guided callback wired to Slack
  poster.ts       # per-channel FIFO queue, ~1 msg/sec, retry w/ backoff on 429 (Retry-After)
  personas.ts     # persona → {username, icon_emoji}; stance→emoji map; name truncation
  blocks.ts       # Block Kit builders: kickoff, panel intro, round header, expert card,
                  # synthesis, cross-exam, guided prompt, final report summary
  guided.ts       # pending-pause registry: {runId → resolver}; reply/reaction/timeout resolution
  store.ts        # slack_runs persistence (Supabase or in-memory, matching RunsRepo pattern)
```

### Run lifecycle

1. **`/delphi` received** → ack within 3 s ("Setting up your panel…"), validate flags + daily cap.
2. **Create channel** (`conversations.create`, name `delphi-<slug>-<rand4>`), invite the asker (`conversations.invite`), set topic to the question.
3. **Create run row** via the existing `RunsRepo` (same shape the HTTP route uses) + a `slack_runs` row mapping `run_id ↔ team_id/channel_id/creator user id/state`.
4. **Start the run in-process** (mirroring `src/api.ts`'s `setImmediate` pattern): `setEventHandler(slackHandler)`, `setGuidedMode(true, slackGuidedCallback)` unless `--no-guided`.
5. **Events → messages** (all through the throttled poster):
   - `personas_generated` → "Meet your panel" (one intro line per persona: name, role, stance emoji, one-sentence background), posted top-level.
   - `round_started` → top-level round header; its `ts` is remembered as the round thread root.
   - `expert_response` → threaded card *as the persona*: position (bold), confidence `7/10`, collapsed reasoning (truncated to ~2,800 chars with "full detail in report"), top 2 sources as links.
   - `contrarian_challenge` → threaded, as "Contrarian" persona: the four stress-test one-liners.
   - `cross_examination` → two threaded messages — challenger persona asks, respondent persona answers. This is the feature's showcase moment.
   - `round_synthesis` → thread summary + a short top-level Moderator digest (clusters, consensus/divergence areas, average confidence).
   - `guided_pause` → top-level Moderator prompt @-mentioning the asker: steer / ✅ continue / auto-continue in N minutes.
   - `report_ready` → final Block Kit summary (consensus position, support level, confidence, key dissent, decision-canvas highlights) + `files.uploadV2` of `report.md` and `report.json`; optional auto-archive.
   - `run_error` → apologetic message with the error; run row already marked `error` by existing flow.
6. **Inbound messages** (Events API): ignore our own bot messages (`bot_id`) and non-`delphi-*` channels; during a guided pause, first qualifying human reply resolves the pause; otherwise buffer messages for injection at the next pause; `reaction_added` ✅ on the pause message resolves with `null` (continue unchanged).

### Database migration `0008_slack_runs.sql`

```sql
create table public.slack_runs (
  run_id uuid primary key references public.runs(id) on delete cascade,
  team_id text not null,
  channel_id text not null,
  channel_name text not null,
  slack_user_id text not null,          -- the asker
  guided boolean not null default true,
  state text not null default 'active'  -- active | paused | completed | error | archived
    check (state in ('active','paused','completed','error','archived')),
  round_thread_ts jsonb not null default '{}'::jsonb,  -- {"1":"1712.34", ...}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index slack_runs_channel_idx on public.slack_runs (team_id, channel_id);
alter table public.slack_runs enable row level security;
-- service-role only: no anon/authenticated policies (engine uses service key)
```

Additive only — no changes to existing tables or policies. The in-memory fallback keeps CLI/dev usable without Supabase.

### Restart behaviour

Runs execute in-process, so an engine restart kills in-flight runs; the existing `failInterrupted()` already marks them `error` on boot. Slack addition: on boot, find `slack_runs` in `active`/`paused` whose run is now `error` and post "This deliberation was interrupted by a restart — start a new one with `/delphi`." No attempt to resume mid-run in v1 (the engine has no checkpointing; that's a much bigger project).

---

## 7. Phased delivery

Each phase is independently shippable and leaves `main`-equivalent behaviour intact.

| Phase | Scope | Deliverable | Est. size |
|---|---|---|---|
| **0. Groundwork** | Add `test:run` script (`vitest run`) and a minimal GitHub Actions workflow (typecheck `tsc --noEmit` + `vitest run`). Establishes the "don't break anything" safety net this plan depends on. | Green CI on existing code | S |
| **1. Event layer** | `src/events.ts`, emit calls in `main.ts`, `setEventHandler`. Unit tests: handler receives expected sequence (mocked agents); handler exceptions don't fail runs; no-handler path unchanged. | Engine emits typed events; zero behaviour change | M |
| **2. Slack scaffold** | `@slack/bolt` dep; `src/slack/{index,config,commands,store}.ts`; mount receiver in `api.ts` behind `isSlackEnabled()`; migration 0008; app manifest; `/delphi` creates channel + starts run (progress as plain Moderator text). | End-to-end run from Slack, minimal formatting | M |
| **3. Persona experience** | `poster.ts` throttled queue, `personas.ts`, `blocks.ts`; per-persona styled messages, round threads, cross-exam dialogues, synthesis digests. | The "panel in a channel" experience | M–L |
| **4. Human-in-the-loop** | `guided.ts`: pause prompts, reply/✅/timeout resolution, mid-round buffering, @-mention of asker. | Steerable deliberations | M |
| **5. Report & lifecycle** | Final Block Kit report, `files.uploadV2` artifacts, auto-archive, restart cleanup, daily cap. | Complete lifecycle | S–M |
| **6. Hardening & docs** | 429/network retry paths, idempotent event delivery (Slack retries events — dedupe on `event_id`), README + `docs/slack-setup.md`, manual test checklist. | Production-ready | S–M |

Suggested checkpoints: demo after Phase 2 (proves plumbing), after Phase 4 (proves the concept), ship after Phase 6.

---

## 8. Not breaking existing functionality — explicit guarantees

| Surface | Change | Guarantee |
|---|---|---|
| `DelphiAgent` public API | Additive `setEventHandler` only | CLI, `examples/`, API route all call it exactly as before; no handler ⇒ no new code paths beyond a null check |
| Console output | None (events are *in addition to* logs) | CLI UX and `liveLogs` SSE capture byte-identical |
| REST API routes | None modified; Slack routes added under `/slack/*` | Existing clients (web proxy) unaffected; `/slack/*` returns 404 when feature disabled |
| `apps/web` | Zero changes | Nothing to regress |
| Legacy `web/` SPA + Edge Function | Zero changes | Untouched execution path |
| Database | Additive migration `0008` only | No existing table/policy altered; app code never selects new table unless Slack enabled |
| `render.yaml` | Add optional Slack env vars to `delphi-secrets` | Absent vars ⇒ feature fully disabled at boot |
| Dependencies | `+ @slack/bolt` (runtime) | No version bumps of existing deps |
| Tests | Existing `basic.test.ts` must stay green; new tests are new files | CI (Phase 0) enforces this on every phase |

Rollback story: because every phase is additive and env-gated, disabling the feature = unset `SLACK_BOT_TOKEN`. No migration rollback needed (table is inert).

---

## 9. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Slack 1 msg/sec/channel** vs parallel expert bursts | Dropped/429'd messages | Per-channel FIFO queue in `poster.ts`; honour `Retry-After`; order round content deterministically |
| **Slack retries events** (3× on non-2xx / slow ack) | Duplicate guided-resume or double-buffered input | Ack immediately, process async; dedupe on `event_id` (LRU) |
| Message length limits (~4 k chars text; 50 blocks) | Truncated expert reasoning | Truncate with "see full report"; full detail always in the artifact |
| Guided pause never answered | Run hangs, tokens idle | Hard timeout (default 15 min) auto-continues; state persisted in `slack_runs.state` |
| Engine restart mid-run | Channel left dangling | Boot sweep posts interruption notice (existing `failInterrupted` handles the run row) |
| Channel name collisions (incl. archived) | `name_taken` error | Random suffix + retry with new suffix |
| Cost abuse via `/delphi` | Unbounded spend | Daily per-workspace cap; runs use workspace key, never user BYOK in v1 |
| **Pre-existing build gap**: `npm run build` ≠ engine build (`dist/` never produced by committed scripts) | Engine deploys depend on an undocumented step; Phase 0 CI typecheck partially covers this | Flagged for a separate decision — recommend adding `build:engine: tsc` and pointing Render at it, but that changes deploy behaviour, so it should be its own reviewed change, **not** smuggled into this feature |
| `conversations.history` 1 req/min (non-Marketplace) | Any polling design breaks | Design is 100 % event-driven; we never call history/replies |
| Bolt + Express 5 compatibility (`ExpressReceiver` targets Express 4) | Router mount friction | Verify at Phase 2 spike; fallback = run Bolt's receiver on its own port inside the same process (still in-process for guided mode) |

---

## 10. Explicit non-goals (v1) / future work

- **Persona avatars as images** (Supabase Storage + `icon_url`) — v1 uses stance emoji.
- **Ask-a-persona directly** ("@Delphi ask Dr. Okafor about…") mid-round — needs a lightweight single-persona responder outside the round loop; great v2 feature.
- **Slack user ↔ Supabase user mapping / BYOK from Slack** — v1 is workspace-keyed.
- **Signal-tracker reminders into the channel** (12-month regime signals as scheduled Slack messages) — natural retention feature once lifecycle basics are solid.
- **Resuming interrupted runs** — requires engine checkpointing; out of scope.
- **Multi-workspace distribution / Marketplace listing** — v1 is single-workspace (env-token install).
- **Web dashboard SSE upgrade** to consume the new typed events — enabled by Phase 1 but a separate effort.

---

## 11. Testing strategy

- **Unit (vitest, new files under `src/tests/`):**
  - Event emitter: sequence, isolation (subscriber throw ≠ run failure), no-handler path.
  - `personas.ts`: stance→emoji map, username truncation, channel-name slugging (length, charset, collisions).
  - `blocks.ts`: builders produce valid block structures within Slack limits (snapshot tests).
  - `poster.ts`: queue ordering, throttle timing (fake timers), 429 retry with `Retry-After`.
  - `guided.ts`: resolve-by-reply / reaction / timeout; buffered mid-round input; double-resolve safety.
  - `commands.ts`: flag parsing, cap enforcement.
- **Integration:** Bolt `App` with a stubbed Slack `WebClient` (injected client — no network); a mocked `DelphiAgent` emitting a scripted event sequence; assert the full message choreography for a 2-round run. Existing `basic.test.ts` must pass throughout.
- **Manual checklist (dev workspace, Socket Mode):** `/delphi` happy path; guided steer + ✅ + timeout; long answers (truncation); expert failure mid-round; restart mid-run; daily cap; feature-disabled boot (no Slack env) shows zero Slack code loaded.

---

## 12. Decisions to confirm before Phase 2

1. **Service placement** — plan assumes in-engine mount (D1). OK?
2. **Default guided timeout** — 15 min proposed. (Runs take multiple minutes per round anyway.)
3. **Auto-archive on completion** — default on?
4. **Daily run cap** — 5/workspace/day proposed.
5. Whether to tackle the pre-existing engine build gap (§9) as a standalone fix first.

---

## Sources

- [Rate limit changes for non-Marketplace apps — Slack changelog (May 2025)](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/) · [clarification (June 2025)](https://docs.slack.dev/changelog/2025/06/03/rate-limits-clarity/) · [Rate limits reference](https://api.slack.com/apis/rate-limits)
- [`chat.postMessage`](https://docs.slack.dev/reference/methods/chat.postMessage/) · [`chat:write.customize` scope](https://docs.slack.dev/reference/scopes/chat.write.customize/)
- [Bolt for JavaScript — Socket Mode](https://tools.slack.dev/bolt-js/concepts/socket-mode/) · [Using Socket Mode](https://docs.slack.dev/apis/events-api/using-socket-mode/)
