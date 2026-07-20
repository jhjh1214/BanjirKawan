# BanjirKawan — Slide Deck Spec (the pitch is the deck)

**Confirmed by the organiser:** the pitch is **online over Zoom**, and the focus is
**"your idea and business sides of the solution"** — *not* a live product demo. So
the deck IS the pitch (screen-shared), and it must carry the business case. The
built product appears as **embedded proof/traction**, not a live click-through.
It's also the required post-hackathon upload.

**10 slides, ~30s each.** Judges are systems-leadership academics, and the
organiser wants the business front-and-centre — so the visual anchors are
**Slide 3 (system map)**, **Slide 7 (business model)**, and **Slide 9 (loops +
worst day)**. Clean, one idea per slide, big type, no emojis, sky-600 accents.

Legend: **[V]** verbatim in `pitch-script.md`; **[IMG]** capture from the live app;
**[RUBRIC]** category the slide banks.

---

### Slide 1 — Title
- **BanjirKawan** — large. Subtitle: *"Turning flood warnings into shop-level
  survival plans — and survival plans into claim evidence."*
- Footer: Problem 1 · Team of 3 (names) · Climate Systems Hackathon 2026.
- `[RUBRIC: Clarity]`

### Slide 2 — The person and the gap
- Left: "Kak Ros, kedai runcit, Taman Sri Muda. **December 2021: −RM 40,000.**"
- Right, stacked: *The warning existed.* → *It reached a dashboard.* → *It never
  reached her shop floor.*
- Strip: *"A warning only helps if people can act."*
- `[V]` Hook & Frame. `[RUBRIC: Problem Understanding]`

### Slide 3 — The system map  ← **anchor**
- Left-to-right diagram: `Rain → Rivers → JPS telemetry (≈200 stations,
  thresholds) → [dashboard]` then a **thick red broken arrow "THE LAST METRE"** →
  `Shop floor → Owner action → Damage / Claim → Loan / Recovery`.
- Circle the broken arrow: **"One broken link. Everything downstream flows from it.
  This is our intervention point — highest leverage, lowest cost."**
- Small iceberg inset (Event / Pattern / Structure / Mental model).
- `[V]` Analyse & Map. `[RUBRIC: Systems Thinking — core]`

### Slide 4 — Weather to wallet (and the market)
- Chain chips: **Weather event → What's hit → Effect → Cost.**
- Four money effects: damaged goods · lost sales · cleanup costs · costlier loan
  (no evidence → denied claim).
- Big: **RM 6.1B** national losses (Dec 2021) — labelled *"the market we address."*
- `[RUBRIC: Problem Understanding · Metrics]`

### Slide 5 — How it works (the design principle)
- Split panel:
  - **Dry day (AI thinks):** 5 photos → asset risk map → owner confirms → cached
    tiered playbooks.
  - **Storm day (dumb + deterministic):** threshold → cache lookup → send.
  - **After: claim report** from 5 after-photos, evidence = river telemetry.
- Banner across the seam: **"AI is never in the storm path."**
- `[V]` The Solution. `[RUBRIC: Quality of Solution · Systems Thinking]`

### Slide 6 — It's already built (proof / traction)  ← **replaces "live demo"**
- **Embed a 15–20s screen recording** (looping MP4/GIF): SIMULATE-FLOOD → phone
  buzz → checklist arrives → action ticks off on the dashboard. This is the single
  most persuasive asset and needs **no live app on the call**.
- Around it, 3 small `[IMG]` captioned stills: **live danger map** ("301 stations,
  2 real escalations this week"), **claim report** ("evidence = JPS telemetry"),
  **metrics dashboard**.
- Header: **"Not a concept — deployed, on real data."**
- `[V]` proof beat. `[RUBRIC: Quality of Solution 25]`

### Slide 7 — The business  ← **anchor (organiser's focus)**
- Title: **B2B2C — and the shop is the smallest payer.** Three payer cards:
  1. **Insurers / takaful (anchor):** completed checklist = claim avoided; verified
     report = claim in minutes, not adjuster-weeks. Priced per policy / per claim avoided.
  2. **State & local councils:** district-wide SME resilience at software cost.
  3. **Kedai (freemium):** basic alerts free; plan + claim features **RM 19/mo.**
- Bottom band, three economics call-outs: **Marginal cost/shop/flood ≈ 0** (one
  dry-day AI call, then DB lookup + one message) · **Data moat** (site graphs +
  behavioural completion data nobody else has) · **GTM: one takaful + one council
  pilot**, measured vs the next street.
- `[V]` The Business. `[RUBRIC: Quality of Solution 25 · Metrics]`

### Slide 8 — Impact, measured
- Six metric tiles from the running system: **RM 10,600–22,200 protected · 3h 12m
  lead time · 2.0s dispatch · 83% completion · 90s first action · report in 4 min
  (vs weeks).**
- Footer: *"The numbers a takaful actuary and a council underwrite against."*
- `[V]` Impact. `[RUBRIC: Metrics 15]`

### Slide 9 — Resilient as a system  ← **anchor**
- Two loop diagrams: **Balancing** (completed checklists → better playbooks) ·
  **Reinforcing** (paid claims → trust → more shops).
- **Worst-day table:** *Feed dies → watchdog advisory* · *Network dies → earliest
  tier + paper plan* · *Floods double → marginal cost ≈ 0, plans cached.*
- Strip: **3 channels — Telegram · SMS · Paper. No single point of failure.**
- `[V]` Systems Depth. `[RUBRIC: Systems Thinking 20 — tiebreaker]`

### Slide 10 — It transfers + close
- SEA map with pins: **Shah Alam · Johor · Jakarta · Medan/Bukit Lawang** (name the
  immersion-trip valley). Caption: *"Same monsoon, same last-metre gap, same fix,
  same three payers."*
- Close line, large: **"Every flood warning becomes a survival plan — and every
  survival plan becomes claim evidence."**
- `[V]` Close. `[RUBRIC: Systems Thinking · Clarity]`

---

## Rubric coverage check (all 100)

| Category | Pts | Banked on slides |
|---|---|---|
| Problem Understanding | 25 | 2, 3, 4 |
| Quality of Solution | 25 | 5, 6, **7** |
| Systems Thinking | 20 | **3, 9**, 10 |
| Metrics & Measurability | 15 | 4, 7, 8 |
| Clarity of Pitch | 15 | 1, 10 + clean single-idea slides throughout |

## Build notes
- **Deliver online:** one person screen-shares this deck on Zoom start to finish.
  Test that the **embedded recording plays inside screen-share with audio** before
  the day — this is the #1 technical risk now, not wifi to the app.
- Capture `[IMG]` stills at 2× on the deployed app in **light mode** with the
  seeded demo data loaded (non-zero metrics).
- Export a **PDF** for upload (keep the editable source with the embedded video).
- Under time pressure, the slides you must not cut are **3, 7, 9** — they carry
  systems (20) and the business the organiser told us to lead with.
