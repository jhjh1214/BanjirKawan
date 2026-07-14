# BanjirKawan — 100-Point Rubric Self-Audit

The official rubric (Hackathon webinar, slide 14). This maps every category to
concrete, checkable evidence in the product and pitch, so nothing is left to
the judges' imagination. Honest self-scores; the gap to 100 is noted per row.

| Category | Pts | Self-score | Evidence |
|---|---:|---:|---|
| Problem Understanding | 25 | 23 | below |
| Systems Thinking | 20 | 19 | below |
| Quality of Solution | 25 | 24 | below |
| Metrics & Measurability | 15 | 14 | below |
| Clarity of Pitch | 15 | 14 | below |
| **Total** | **100** | **94** | *(execution-dependent; rehearsal closes the last points)* |

---

## Problem Understanding — 25

- **One clear place, one climate problem** (the bar's #1 tick): a flood-prone
  kedai runcit street; the Taman Sri Muda persona, Sungai Damansara station.
- **Named users:** shop owners/hawkers (primary), plus majlis perbandaran /
  JPS and takaful operators (payers).
- **Physical vs transition risk:** correctly identified as *physical* (acute
  flood); we say so.
- **The weather→wallet chain**, demonstrated not asserted: *weather event →
  what's hit → the effect → the money*, with real RM values per asset on every
  checklist line.
- **All four money effects (S/C/D/L):** Damaged stuff (RM protected), fewer
  Sales (days shut), higher Costs (cleanup/spoilage), costlier Loans (no
  evidence → denied claims). Mapped in `docs/pitch-notes.md`.
- **Lived national trauma quantified:** Dec 2021 ≈ RM6.1B.
- *Gap to 25:* depends on P1 opening with the Frame crisply on the day.

## Systems Thinking — 20

- **Iceberg, both sides** (diagnose + solution): event → pattern → systemic
  structure → mental model, and the new structure/mental-model we install.
  Full treatment in `docs/systems-thinking.md`.
- **All 7 maxims mapped to code**, especially #1 side effects & #2 cure-worse
  (AI out of the storm path), #3 structures drive behaviour (the ESLint rule),
  #6 delays (watchdog + learning-loop delay bridged by live metrics).
- **Two causal loops:** balancing (learning loop, delay labelled) + reinforcing
  (claims→trust→completion flywheel, runaway risk noted).
- **Five Marks of a system that holds** — all five claimable with named modules.
- **The Problem-1 systems angle answered** ("power, phones, roads too"): three
  delivery channels + power-aware early-tier timing.
- **Honest side-effect self-critique:** alert fatigue, digital exclusion,
  automation complacency — each with a mitigation.
- *Gap to 20:* the systems slide must be delivered, not just documented.

## Quality of Solution — 25

- **Working end-to-end, deployed** on Railway; live URL. Not a mockup.
- **Resilient by design:** AI never in the critical path (build-enforced),
  cached playbooks, model fallback chain, dispatch status machine with retries,
  staleness watchdog, degraded-mode channels.
- **Zero new infrastructure:** bolts onto JPS InfoBanjir + Telegram + existing
  aid/takaful institutions.
- **10-minute onboarding**; validated AI (schema + physics + owner confirm).
- **Honest limits stated** (offline onboarding needs a field partner; alert
  fatigue residual).
- **Engineering rigour:** 95 unit tests, golden fixtures from real generated
  output, key-parity i18n tests, import-boundary lint.
- *Gap to 25:* essentially none technically; a live glitch on stage is the only risk (mitigated by the seeded offline demo + backup recording).

## Metrics & Measurability — 15

- **Auto-captured from the dispatch audit trail** — the metrics *are* the
  audit trail: RM protected (ranges), warning lead time, detect→send latency,
  checklist completion, median time-to-first-action, claim-report turnaround.
- **Behavioural telemetry** (check-off timing) — rare and defensible.
- **Live on screen** during the demo; ticks in real time as the phone is tapped.
- **Offline-seedable** (`npm run seed:demo`) so numbers are non-zero without
  live data. 14 golden-fixture tests pin the maths.
- *Gap to 15:* `reportsIssued` shows 0 until one recovery report is created on
  the demo DB — do this in the dry run.

## Clarity of Pitch — 15

- **One place, one problem, one solution** — the bar's final tick.
- **The 6-step build is the visible spine** (Frame → Analyse → Money → Idea →
  Fund → Pitch), named aloud.
- **Story arc:** one shopkeeper (Kak Ros) carried start to finish; before/after.
- **Live phone-buzz demo** + the "kill every AI, it still fires" line.
- **Clean 3-person handoffs**, one sentence each, no dead air.
- **Backup recording** + the resilience joke for wifi failure.
- *Gap to 15:* pure rehearsal. Run the handoffs 5×.

---

## The webinar's 6-tick "strong solution" bar — all six ticked

| Tick | Status |
|---|---|
| One clear place | ☑ flood-prone kedai street |
| Asked 'what if?' | ☑ Dec-2021-repeat + 3 canonical scenarios + worst-day table |
| Money makes sense | ☑ four effects, quantified live |
| Systems view (won't backfire) | ☑ AI out of critical path, lint-enforced |
| A way to pay | ☑ insurers / councils / RM19-mo |
| Real & honest | ☑ deployed, tested, limits stated |

Tick all six = both sessions used (climate resilience **and** systems thinking).
That is the explicit definition of a complete submission.

---

## The three things that convert 94 → 100 (all execution, no code)

1. **Rehearse the 3-person handoffs and the live demo 5×** until the phone-buzz
   and the metric-tick land on cue. This is where the last Clarity + Quality
   points live.
2. **Create one recovery report on the production demo DB** before the pitch so
   `reportsIssued` and the loss-report page are non-empty on the day.
3. **Open with the Frame, not the tech** — 15 seconds of Kak Ros before a single
   feature. Problem Understanding is the biggest single category (25); it is
   won in the first minute, by story, not by architecture.
