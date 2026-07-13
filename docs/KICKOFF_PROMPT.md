# CLAUDE CODE — DAY 1 KICKOFF PROMPT
Paste everything below the line into Claude Code from an empty `banjirkawan/` directory that contains BLUEPRINT.md. Work through it in order; it is deliberately scoped to Day 1 only.

---

You are the lead engineer for BanjirKawan. Read BLUEPRINT.md in this directory FULLY before writing any code — it is the single source of truth for architecture, module boundaries, schemas, and scope. Do not deviate from its repository structure or dependency rules.

## Your Day 1 mission (scaffold + plumbing only — no AI features today)

### 1. Project scaffold
- Next.js 14 (App Router) + TypeScript strict + Tailwind, single package.
- Create the exact directory tree from BLUEPRINT.md §3 (empty index.ts stubs with typed public interfaces are fine for modules we build later: site-intelligence, playbook, recovery, learning).
- ESLint with a `no-restricted-imports` rule enforcing: `src/modules/**` must not import from `src/app/**` or `src/worker/**`; `src/worker/**` and `src/modules/trigger/**` must not import `@anthropic-ai/sdk` or anything from `src/lib/ai/**`. This rule is load-bearing — it enforces "no AI in the critical path."
- `src/lib/config.ts`: Zod-validated env loading that throws with a readable message at boot. Vars per BLUEPRINT.md §8.
- `src/lib/logger.ts`: minimal structured JSON logger (level, msg, context), no dependencies.

### 2. Database
- Write `supabase/migrations/0001_init.sql` implementing the schema in BLUEPRINT.md §3 exactly (shops, site_graphs, playbooks, river_readings, flood_events, dispatches, outcomes), with the check constraints and sensible indexes (shops.nearest_station_id, river_readings(station_id, ts desc), dispatches.status).
- `src/lib/db/client.ts`: Supabase server client (service role, server-side only).
- Repositories in `src/lib/db/repositories/` for shops, site_graphs, playbooks, events (flood_events + river_readings), dispatches, outcomes. Typed methods only for what Day 1–5 needs: create/getLatest/list patterns. No SQL outside repositories.

### 3. InfoBanjir ingestion (src/modules/trigger/)
- `infobanjir.ts`: fetch river level data for states in `INFOBANJIR_STATE_CODES` from `https://publicinfobanjir.water.gov.my/aras-air/data-paras-air/?state={CODE}&lang=en`. Parse the station table (station id, name, current level, and the published normal/alert/warning/danger threshold columns). The page is server-rendered HTML — parse with cheerio. Isolate ALL parsing in this one file behind a typed `fetchStationReadings(state: string): Promise<StationReading[]>` function.
- Add `tests/fixtures/infobanjir-sample.html` (save a real response during development) and a unit test that parses the fixture, so the demo never depends on live availability or site changes.
- `thresholds.ts`: pure function `classify(reading): 'normal'|'alert'|'warning'|'danger'` using the station's own published thresholds. Unit test it.
- `watchdog.ts`: pure function that, given last-reading timestamp and now, returns freshness state (fresh | stale | dead) with 10-minute stale boundary. Unit test it.

### 4. Worker (src/worker/main.ts)
- Long-running loop: every `POLL_INTERVAL_SECONDS`: fetch readings for configured states → persist to river_readings → classify each against thresholds → log tier changes. Dispatch logic is Day 5; today just detect and log `TIER_CHANGE station=X from=normal to=warning`.
- Heartbeat: upsert a `worker_heartbeat` timestamp (add a tiny key-value table `system_status(key text pk, value jsonb, updated_at)` to the migration).
- Graceful shutdown on SIGTERM.

### 5. Telegram (src/modules/delivery/ + api route)
- `telegram.ts`: `sendMessage(chatId, text)` via Bot API with fetch, plus webhook payload types.
- `src/app/api/telegram/route.ts`: webhook endpoint validating `TELEGRAM_WEBHOOK_SECRET`; on `/start`, reply with a welcome message and log the chat_id (we'll bind it to a shop on Day 5). Echo any other text back prefixed "BanjirKawan received: ".

### 6. Docker + deploy
- `Dockerfile.web`: multi-stage, node:20-alpine, Next standalone output.
- `Dockerfile.worker`: node:20-alpine, runs `node dist/worker/main.js` (add a tsup or tsc build for the worker entrypoint).
- `docker-compose.yml`: web + worker with shared .env, worker restart: always.
- `README.md`: exact commands — local dev, docker-compose up, Railway deploy steps (two services from same repo, each pointing at its Dockerfile), Supabase migration application, Telegram webhook registration command (curl).

### 7. Placeholder UI
- Landing page: product name, one-liner ("Setiap amaran banjir menjadi pelan tindakan kedai anda"), and a status card reading worker heartbeat + latest river readings from the DB (proves plumbing end-to-end visually).
- `/demo` page: a "SIMULATE FLOOD" button POSTing to `/api/trigger` with `{stationId, tier}`. Today the route just inserts a flood_events row with simulated=true and logs; wiring to dispatch comes Day 5.

## Definition of done (verify each, in order)
1. `npm run lint && npm run test` green; the import-boundary lint rule demonstrably fails if trigger/ imports lib/ai (show me by writing then deleting a violating import).
2. `docker-compose up` boots web + worker locally with no errors.
3. Worker logs real Selangor station readings within one minute of boot.
4. Landing page shows live readings + heartbeat.
5. Telegram bot echoes.
6. Migration applies cleanly to a fresh Supabase project.
7. README deploy steps are complete enough that I can deploy to Railway without guessing.

Work incrementally: after each numbered section, run the relevant checks before moving on. If the InfoBanjir HTML structure differs from expectations, adapt the parser but keep the typed interface stable — and immediately save the real HTML as the test fixture. Ask me nothing you can decide from BLUEPRINT.md; flag any decision you make that deviates from it in a final summary.
