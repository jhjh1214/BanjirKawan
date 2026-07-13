# BANJIRKAWAN (codename: raincheck-my)
### "We keep your kedai alive before the banjir — and get you paid after."

Master blueprint — Climate Resilience Hackathon, pitch date **22 July 2026**. Solo builder, 9 days, all free-tier tooling, Railway hosting.

---

## 1. THE IDEA IN ONE PARAGRAPH

Malaysia has world-class flood telemetry (JPS Public InfoBanjir: ~200 real-time river/rainfall stations with published alert/warning/danger thresholds, plus 2-day monsoon forecasts from PRABN). What it does not have is the **last metre**: turning "Sungai Klang at WARNING level" into "*your* shop, *your* freezer, *your* next 3 hours." BanjirKawan onboards a small business with ~5 phone photos; AI vision builds a structured **site risk graph** (floor-level assets, power points, stock locations, values); AI synthesizes a **tiered, timed action playbook** per official river thresholds — pre-computed, validated, and **cached**. When a station crosses threshold, a deterministic trigger sends the cached playbook via Telegram in Bahasa Melayu/English/Chinese. After the flood, the same site graph becomes the **evidence baseline**: a guided photo walkthrough diffs damage against the pre-flood inventory and generates a timestamped loss report formatted for bantuan banjir aid applications and takaful claims. One vision pipeline, two life-saving outputs — before and after.

**The engineering thesis (say it in every room):** AI is never in the critical path. It thinks on dry days — surveying, planning, caching. During the storm, the alert path is dumb, deterministic, offline-tolerant code: threshold → cache lookup → send. The resilience tool is itself resilient to the climate event.

---

## 2. EVENT BRIEF ALIGNMENT

### The 6-Step Build
| Step | Our answer |
|---|---|
| **Frame** | ONE place: flood-prone SME shophouse streets (demo persona: kedai runcit in Taman Sri Muda, Shah Alam). ONE problem: flood warnings exist but carry no shop-specific actions; SMEs lose stock, equipment, and then drown in aid/claims paperwork. |
| **Analyse** | Weather/physical risk. "What if December 2021 repeats — but this time every shop has 6 hours of usable lead time?" River-basin floods give hours of warning via InfoBanjir thresholds; intensity and frequency are rising. |
| **Money** | All four effects: (1) asset damage — stock, freezers, wiring; (2) business interruption — days-to-weeks closed; (3) insurance — rising premiums, under-insurance, denied claims from poor evidence; (4) recovery cost — bantuan applications delayed by missing documentation. Anchor number: Dec 2021 floods ≈ RM6.1B national losses. |
| **Idea** | "Get ready" resilience fix (the brief's second lever), covering the full event lifecycle: prepare → act → recover. Not new infrastructure — a translation layer on top of what exists. |
| **Fund** | Three nameable payers: SME subscription (~RM19/mo), takaful/insurer white-label (completed checklists = claims that never happen; clean evidence = cheap claims processing), majlis perbandaran / state DID licensing per district. |
| **Pitch** | "Every flood warning becomes your shop's personal survival plan — and every survival plan becomes your claim evidence." 90-second live demo, phone buzzing on stage. |

### 100-Point Rubric Mapping
| Criterion | Pts | How we score it |
|---|---|---|
| Problem Understanding | 25 | Named place, named users (SME owners, hawkers, majlis, takaful ops), lived national trauma (Dec 2021), quantified losses, gap precisely located (last metre, not warnings). |
| Systems Thinking | 20 | Demo'd feedback loop (outcome photos → sharper site graph → better playbook v2). Named reinforcing loop (aggregate outcomes → insurer losses fall → subsidised subscriptions → adoption → better data). Named failure loop + mitigation (alert fatigue → severity tiers + post-event threshold calibration). Named equity note (continuity planning was a corporate luxury; now RM19/mo). |
| Quality of Solution | 25 | Working end-to-end live demo; offline-resilient by design; bolts onto InfoBanjir + Telegram (zero new infra); 10-minute onboarding; validated AI outputs (schema + physics rules); honest limits stated. |
| Metrics & Measurability | 15 | Auto-captured in dispatch audit trail: minutes of lead time delivered; playbook completion rate (Telegram check-offs); RM damage avoided per event (asset value × completed actions); onboarding time; claim/bantuan document turnaround. |
| Clarity of Pitch | 15 | One-liner + live phone-buzz demo + before/after story arc. Backup recorded demo (and the joke: "our demo's critical path doesn't depend on live wifi either"). |

---

## 3. ARCHITECTURE

### Design rules (non-negotiable)
1. **AI at the edges, determinism at the core.** Claude runs at onboarding and post-event learning only. The storm-time path contains zero AI calls, zero non-essential network dependencies.
2. **Modular monolith.** One repo, hard module boundaries, framework-free domain core. Any module can be extracted to a service later without rewrites.
3. **Every AI output is validated.** LLM JSON → Zod schema → physics/feasibility rules engine → only then persisted. Nothing unvalidated reaches a user or the DB.
4. **Append-only versioning** for site graphs and playbooks: audit trail, before/after learning demo, rollback safety.
5. **Fail loud and safe.** Stale data flags, degraded-mode messages, retry with backoff, dead-letter statuses.

### Deployment topology (Railway, Docker)
```
┌─────────────────────── Railway project ───────────────────────┐
│                                                                │
│  service: web            service: worker                      │
│  (Dockerfile.web)        (Dockerfile.worker)                   │
│  Next.js 14 App Router   Node 20 long-running process          │
│  dashboard (PWA) + API   InfoBanjir poller (30s loop)          │
│  onboarding wizard       threshold engine                      │
│  demo/simulate console   dispatcher → Telegram                 │
│                          heartbeat + staleness watchdog        │
│                                                                │
└───────────────┬───────────────────┬───────────────────────────┘
                │                   │
        Supabase (free tier)   External (all free)
        Postgres + Storage     - InfoBanjir (river/rain levels + thresholds)
        (site graphs,          - Claude API (vision + synthesis, edge-time only)
         playbooks cache,      - Telegram Bot API (delivery + check-offs + webhook)
         dispatch audit)       - OpenStreetMap/Nominatim (geocoding MY addresses)
```
- Local dev: `docker-compose.yml` runs web + worker + (optional) local Postgres.
- Railway deploys each service from its own Dockerfile. Shared code via the monorepo — both images build from repo root with different entrypoints.
- Mobile story: **PWA** (manifest + installable dashboard) + **Telegram as the field channel**. No native app — deliberate, defensible choice (works during floods, zero install friction).
- K8s: explicitly out of scope. Judges' answer: "containerized with a clean web/worker seam; K8s is a deployment target, not a rewrite."

### Repository structure
```
banjirkawan/
├── docker-compose.yml
├── Dockerfile.web
├── Dockerfile.worker
├── .env.example                  # every var documented
├── package.json                  # single package, two entrypoints
├── BLUEPRINT.md                  # this file
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO_SCRIPT.md
│   └── PITCH.md
├── supabase/migrations/          # versioned SQL
├── scripts/
│   ├── seed-demo.ts              # 5 demo shops in one command
│   └── simulate-flood.ts         # CLI trigger for rehearsal
├── tests/
│   ├── unit/                     # rules-engine, prioritizer, thresholds ONLY
│   └── fixtures/                 # golden site graphs + playbooks
└── src/
    ├── app/                      # Next.js — thin delivery layer only
    │   ├── (marketing)/page.tsx
    │   ├── onboard/              # wizard: address → photos → confirm graph
    │   ├── dashboard/            # shop view, playbook viewer, street view
    │   ├── recover/              # post-flood guided walkthrough UI
    │   ├── demo/                 # judge console: SIMULATE FLOOD button
    │   ├── manifest.ts           # PWA
    │   └── api/
    │       ├── onboard/route.ts
    │       ├── playbook/route.ts
    │       ├── trigger/route.ts      # manual simulate (worker owns real polling)
    │       ├── recover/route.ts
    │       └── telegram/route.ts     # webhook: check-offs, /status, photo intake
    ├── worker/
    │   └── main.ts               # poll loop → threshold → dispatch (NO AI IMPORTS — enforced by lint rule)
    ├── modules/                  # domain core — framework-free, no Next.js imports
    │   ├── site-intelligence/    # photos → SiteGraph
    │   │   ├── extractor.ts      # Claude Vision call
    │   │   ├── enricher.ts       # + geocode, nearest station, elevation heuristic
    │   │   ├── validator.ts      # Zod + sanity rules (values, counts, coherence)
    │   │   ├── schema.ts
    │   │   └── index.ts          # public interface ONLY
    │   ├── playbook/             # SiteGraph → tiered timed plans
    │   │   ├── synthesizer.ts    # Claude constrained generation (BM/EN/ZH)
    │   │   ├── rules-engine.ts   # time-feasibility, dependency order, physics
    │   │   ├── prioritizer.ts    # value × vulnerability × time-to-execute
    │   │   ├── schema.ts
    │   │   └── index.ts
    │   ├── trigger/              # CRITICAL PATH — zero AI, zero Claude imports
    │   │   ├── infobanjir.ts     # fetch + parse station levels (per-state)
    │   │   ├── thresholds.ts     # station alert/warning/danger → tier map
    │   │   ├── dispatcher.ts     # cached playbook lookup → delivery queue
    │   │   ├── watchdog.ts       # staleness detection → degraded-mode msg
    │   │   └── index.ts
    │   ├── delivery/
    │   │   ├── channel.interface.ts
    │   │   ├── telegram.ts       # send checklist, parse check-off callbacks
    │   │   └── index.ts
    │   ├── recovery/             # post-flood: photos → loss report
    │   │   ├── walkthrough.ts    # guided capture sequence from site graph
    │   │   ├── differ.ts         # Claude Vision: before-graph vs after-photos
    │   │   ├── report-builder.ts # bantuan/takaful-formatted PDF/HTML doc
    │   │   ├── schema.ts
    │   │   └── index.ts
    │   ├── learning/
    │   │   ├── graph-updater.ts  # outcome diff → site graph v+1
    │   │   └── index.ts
    │   └── geo/
    │       ├── geocode.ts        # Nominatim, rate-limited, cached
    │       ├── stations.ts       # nearest InfoBanjir station resolver
    │       └── index.ts
    ├── lib/
    │   ├── ai/
    │   │   ├── claude.ts         # single client: retry ×2, timeout, cost log
    │   │   └── prompts/          # VERSIONED prompt files, never inline strings
    │   │       ├── site-extraction.v1.ts
    │   │       ├── playbook-synthesis.v1.ts
    │   │       └── damage-diff.v1.ts
    │   ├── db/
    │   │   ├── client.ts
    │   │   └── repositories/     # ALL queries live here — no SQL elsewhere
    │   │       ├── shops.repo.ts
    │   │       ├── site-graphs.repo.ts
    │   │       ├── playbooks.repo.ts
    │   │       ├── events.repo.ts
    │   │       ├── dispatches.repo.ts
    │   │       └── outcomes.repo.ts
    │   ├── config.ts             # Zod-validated env at boot — crash early
    │   └── logger.ts             # structured JSON logs (Railway-friendly)
    ├── components/
    │   ├── ui/
    │   ├── site-graph-viewer/    # the onboarding "wow" visual
    │   ├── playbook-card/
    │   ├── storm-simulator/
    │   └── loss-report-viewer/
    └── types/
```

**Dependency rule:** `app/ & worker/ → modules/ → lib/`. Modules never import from app or worker. Modules communicate only via each other's `index.ts`. Enforce with an ESLint `no-restricted-imports` rule — and mention that to judges.

### Data model (Supabase Postgres)
```sql
shops         (id uuid pk, name, address, lat, lng, state_code,
               nearest_station_id, language text default 'ms',
               telegram_chat_id, created_at)

site_graphs   (id uuid pk, shop_id fk, version int, graph jsonb,
               photo_urls text[], enrichment jsonb, confirmed boolean,
               created_at)                     -- append-only

playbooks     (id uuid pk, shop_id fk, site_graph_version int,
               tier text check (tier in ('watch','warning','danger')),
               language text, actions jsonb, validated boolean,
               created_at)                     -- append-only CACHE

river_readings(id bigint pk, station_id, station_name, state_code,
               level_m numeric, threshold_state text, raw jsonb, ts)

flood_events  (id uuid pk, station_id, tier, started_at, ended_at,
               simulated boolean default false)

dispatches    (id uuid pk, playbook_id fk, flood_event_id fk, channel,
               status text check (status in ('queued','sent','failed','dead')),
               completed_actions jsonb, sent_at, updated_at)
               -- audit trail = your metrics slide, for free

outcomes      (id uuid pk, shop_id fk, flood_event_id fk, report_text,
               photo_urls text[], damage_items jsonb, graph_diff jsonb,
               loss_report_url text, created_at)
```

### SiteGraph schema (the core artifact)
```typescript
interface SiteGraph {
  shopType: string;                    // "kedai runcit", "restoran", ...
  floorAreaEstimateSqm?: number;
  entrances: { id: string; facing: string; widthM?: number; stepHeightCm?: number }[];
  assets: {
    id: string;
    label: string;                     // "chest freezer", "rice sacks", "POS terminal"
    category: "equipment"|"stock"|"electrical"|"furniture"|"document";
    heightFromFloorCm: number;         // THE key vulnerability number
    movable: boolean;
    estMoveMinutes?: number;
    estValueRM: { low: number; high: number };  // ranges — honesty by design
    photoRef: string;                  // which photo it was seen in
    confidence: number;                // 0–1; <0.6 → flagged for owner confirm
  }[];
  electrical: { dbBoxHeightCm?: number; outletsNearFloor: boolean };
  risks: string[];                     // free-text observations
}
```
Every asset carries `photoRef` + `confidence`. Onboarding ends with an **owner-confirmation screen** (tap to correct/remove) — this is both the hallucination defence and a judge-Q&A answer.

### Playbook schema
```typescript
interface Playbook {
  tier: "watch" | "warning" | "danger";
  language: "ms" | "en" | "zh";
  estTotalMinutes: number;
  actions: {
    order: number;
    text: string;                      // "Alihkan guni beras ke rak atas"
    targetAssetIds: string[];
    estMinutes: number;
    savesRM: { low: number; high: number };
    deadlineOffsetMin: number;         // relative to trigger time
  }[];
}
```
Rules engine validates: Σ estMinutes ≤ tier lead-time budget; no immovable assets in actions; electrical-off ordered last-but-safe; dependencies coherent. Reject → regenerate once → else flag.

### The critical path (slide-ready diagram)
```
DRY DAY  (AI works here)
photos ──► site-intelligence ──► playbook synth ──► validator ──► CACHE (DB)
                 ▲                                                    
        learning/graph-updater ◄── recovery/differ ◄── post-flood photos

STORM  (zero AI, ~2s, survives Claude/API outages entirely)
InfoBanjir level ──► threshold check ──► cache lookup ──► Telegram send
                          │
                    watchdog: stale >10min ──► degraded-mode advisory
```

### Resilience engineering (Q&A ammunition)
- **InfoBanjir down/stale mid-storm** → watchdog flags staleness; after 10 min sends "conditions unknown — consider Tier-1 precautions." Fails loud and safe.
- **Telegram send fails** → status machine (queued→sent/failed→dead) + exponential backoff retry; channel interface makes SMS a config-level roadmap item.
- **Claude down at onboarding** → retry ×2 → fallback 6-question structured form builds a coarser graph. Onboarding degrades; alerting never does.
- **Railway worker crash** → restart policy + heartbeat row in DB; web shows worker health on demo console.
- **Vision hallucination** → confidence scores + owner confirmation + rules engine. Three independent layers.

### Testing (scoped, not fantasy)
Unit tests ONLY on pure logic that must never be wrong: `rules-engine`, `prioritizer`, `thresholds`, `differ` merge logic. Golden fixtures: 3 site graphs → playbooks must pass validation. No UI/E2E tests — the rehearsed demo is the E2E test.

---

## 4. AI USAGE — WHY IT'S NOT FLUFF (pitch section, memorize)
1. **Vision site survey** replaces an RM3–5k consultant walkthrough. No deterministic system can inventory a million heterogeneous shophouses from phone photos; multimodal AI can. *Previously impossible at scale — now a 10-minute onboarding.*
2. **Constrained playbook synthesis** into a strict schema, validated by a physics rules engine, in the owner's language. The LLM proposes; deterministic code disposes.
3. **Damage diffing**: after-photos vs before-graph → structured loss inventory → bantuan/takaful-ready report. The onboarding artifact doubles as legal-grade evidence baseline — one pipeline, two products.
4. **The inversion**: AI is deliberately excluded from storm-time execution. Most teams will put AI in the demo's hot loop; we can explain why that's wrong.

---

## 5. NINE-DAY PLAN (July 13 → 22)
| Day | Deliverable | Definition of done |
|---|---|---|
| D1 (13–14) | Scaffold + plumbing | Repo, Docker, compose, Railway deploy green ×2 services, Supabase migrations applied, Telegram echo bot live, InfoBanjir parser returns real Selangor station levels |
| D2 (15) | Vision pipeline α | 5 photos → SiteGraph JSON → validator → confirm screen. Test on 3 real photo sets (photograph a real kedai or your kitchen) |
| D3 (16) | Vision pipeline hardened | Confidence flags, owner-edit flow, enrichment (geocode + nearest station). Prompt v2 frozen |
| D4 (17) | Playbook engine | Synthesis (BM+EN) → rules engine → cache. Golden fixtures pass |
| D5 (18) | Trigger + delivery | Worker polls InfoBanjir, threshold map, dispatcher, Telegram checklist with tap-to-check-off, SIMULATE FLOOD button. **Tier 1 complete — pitchable product exists** |
| D6 (19) | Recovery mode | Guided walkthrough UI, damage differ, loss report doc (HTML→print PDF). This is the fusion differentiator |
| D7 (20) | Dashboard + polish | Street view (5 seeded shops), metrics counters from dispatch table, PWA manifest, seed script |
| D8 (21) | FREEZE. Pitch assets | Slides, DEMO_SCRIPT.md rehearsed ×5, backup screen-recording, Q&A drill |
| D9 (22) | Buffer + pitch day | Nothing new ships today. Buffer absorbs D2–D6 slippage |

Scope guardrails: if D3 slips → cut ZH language. If D5 slips → cut check-off buttons (send plain checklist). If D6 slips → recovery mode becomes 3 slides + a mockup screen, core demo unaffected. Never cut: simulate button, Telegram buzz, validator story.

---

## 6. DEMO SCRIPT SKELETON (90 seconds, rehearse verbatim)
1. *(Phone in hand)* "This is Kak Ros's kedai runcit in Taman Sri Muda. I onboarded it in 9 minutes with five photos." → show site graph viewer.
2. "Sungai Klang station just crossed WARNING." → press **SIMULATE FLOOD** on the judge console.
3. *(Phone buzzes — hold it up)* Telegram checklist in Bahasa Melayu, timed, ranked by ringgit saved. Tap one item — dashboard metric ticks live.
4. "And if every AI API on Earth were down right now, this still fires — the AI did its thinking yesterday, not during the flood."
5. "Two weeks later" → recover mode → after-photo → loss report doc appears. "Before the flood we save her stock. After it, we get her paid."

---

## 7. RISK REGISTER (top 5)
| Risk | L | Impact | Mitigation |
|---|---|---|---|
| Vision extraction quality poor on real photos | M | Demo wince | 2 full days (D2–3), confidence+confirm flow, curated rehearsal photo set |
| InfoBanjir HTML structure changes / blocks scraping | L | Trigger dead | Parser isolated in one file; snapshot fixture fallback; simulate mode never depends on live data |
| Claude API credit/rate limits | L | Onboarding blocked | AI only at edges = tiny usage; cache aggressively; fixture fallback for demo |
| Solo-builder illness/slippage | M | Scope collapse | Tiered scope guardrails above; D5 = minimum pitchable product |
| Stage wifi failure | M | Demo dead | Backup recording + the resilience joke; local simulate path needs only DB |

---

## 8. ENV VARS (.env.example)
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
INFOBANJIR_STATE_CODES=SEL,WLH        # Selangor + KL for demo
POLL_INTERVAL_SECONDS=30
APP_BASE_URL=
NODE_ENV=
```
