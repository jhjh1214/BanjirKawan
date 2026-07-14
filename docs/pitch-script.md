# BanjirKawan — 5-Minute Pitch Script (+ Q&A prep)

Timing marks assume a 5:00 slot + 2:00 Q&A. Rehearse with the deployed app;
the demo path never depends on live InfoBanjir or AI availability.

---

## The script

**0:00 — Hook (one shopkeeper, one night)**
> "December 2021. Kak Ros runs a kedai runcit in Taman Sri Muda. The
> government's river station — Sg. Damansara, 2.9 kilometres from her shop —
> crossed WARNING at 2pm. The warning was published. She lost RM40,000 anyway.
> Not because the warning didn't exist — because nobody translated 'river at
> warning' into *her* freezer, *her* rice sacks, *her* next three hours."

**0:45 — The problem is the last metre**
> "Malaysia has ~200 real-time river stations with published thresholds —
> world-class telemetry. What's missing is the last metre: from the river
> gauge to the shop floor. That's what we built. And after the flood, a second
> failure: no evidence, no claim. We fixed both with one artifact."

**1:30 — Live demo (the core 2 minutes)**
1. *(Dashboard)* "This is live JPS data — every station in Malaysia, polled
   every 60 seconds. These impact numbers come from the dispatch audit trail,
   not a spreadsheet."
2. *(Onboard result / site graph)* "Kak Ros onboarded with five phone photos.
   AI surveyed the shop — every asset, its height off the floor, its ringgit
   value. She corrected it on one screen. That happened on a *dry day*."
3. *(Judge console — tap SIMULATE FLOOD, hold up the phone)* "Sg. Damansara
   just crossed WARNING." *(phone buzzes)* "Her checklist: ranked by ringgit
   saved, timed, in Bahasa Melayu. Watch —" *(tap a check-off on the phone;
   point at the screen)* "— completion ticks live. That's behavioural
   telemetry no warning system in this country has ever had."
4. *(The line that lands)* "And if every AI API on Earth went down right now,
   this still fires. The AI did its thinking yesterday. Our linter physically
   blocks AI imports from the storm path — resilience enforced by structure,
   not by memory."
5. *(Recover → open the loss report)* "Two weeks later: five after-photos,
   and this — an itemised claim report whose evidence column is JPS's own
   telemetry. Before the flood we save her stock. After it, we get her paid."

**3:30 — Systems slide (iceberg + worst day)**
> "We treated this as a systems problem. Event: a flooded shop. Pattern: the
> same shops, every monsoon, despite warnings. Structure: warnings are
> river-centric, there's no evidence baseline, knowledge lives in the owner's
> head. Mental model: 'banjir is fate.' We built new structure at every level —
> and designed for the worst day: feed dead? Watchdog tells shops to act
> anyway. Networks dead? The checklist fired hours earlier, and there's a
> laminated plan on the wall. Floods double by 2030? Marginal cost per event
> is zero — the plans are already cached."

**4:15 — Metrics & who pays**
> "Measured, not promised: RM protected per event, 2-second dispatch, 3-hour
> lead times, checklist completion, minutes-not-weeks claim reports — all
> auto-captured. Three customers: takaful operators, because a completed
> checklist is a claim that never happens; district councils, because this is
> resilience at software cost; and the kedai at RM19 a month — continuity
> planning used to be a corporate luxury."

**4:45 — Close**
> "Every flood warning becomes your shop's personal survival plan — and every
> survival plan becomes your claim evidence. The rivers are already telling
> us. BanjirKawan makes sure Kak Ros hears it in time — and gets paid after."

---

## Q&A preparation

| Likely question | Answer |
|---|---|
| **"You're a solo team?"** | "Yes — which is why the discipline lives in the codebase, not in me. The no-AI-in-the-critical-path rule is an ESLint build failure. 95 unit tests, golden fixtures from real generated output, key-parity tests on three languages. The system doesn't depend on my memory." |
| **"What if Telegram/data is down during the flood?"** | "Three layers: timing — the earliest tier fires hours before water, while networks are up, and says so explicitly; variety — the same cached playbook renders to 160-char SMS segments behind a swappable channel interface; and paper — a laminated danger plan with the station's official levels, printed at onboarding." |
| **"What if InfoBanjir itself fails?"** | "A watchdog detects staleness within 10 minutes and messages every bound shop: treat heavy rain as a warning. We fail loud and safe — the failure mode was designed first." |
| **"Isn't this just another alert app?"** | "Alerts exist; that's exactly the problem — they don't act. Shop-level playbooks priced in ringgit, check-off telemetry proving action, and a claims-grade evidence baseline don't exist anywhere else. The alert is the trigger, not the product." |
| **"Does the AI hallucinate assets/values?"** | "Three independent defences: per-asset confidence flags, an owner confirmation screen where every value is editable, and a deterministic validator — physics rules, value caps, budget checks — that rejects and regenerates. And in testing, given photos of an undamaged shop, it honestly reported zero damage." |
| **"Scalability / cost?"** | "Storm-time marginal cost per event is a database lookup and one API call — effectively zero. AI cost is per-onboarding, pennies. The whole country's stations are already being polled by one worker on a hobby-tier box." |
| **"Equity — what about owners without smartphones?"** | "The printed plan covers execution; SMS covers degraded phones; and the insurer/council side of the model exists precisely to subsidise the shops least able to pay. Honest limit: fully offline onboarding needs a field partner — that's our pilot design, not a solved problem." |
| **"Why should we trust the loss numbers?"** | "The report's evidence column is JPS's own public telemetry — an independent third party — plus timestamped before/after photos. Values are ranges from a pre-flood survey the owner confirmed before any flood, which is exactly what makes them credible after one." |
| **"What's next after the hackathon?"** | "A pilot street in Taman Sri Muda with a takaful partner: 20 shops, one monsoon season, measure RM-protected and claim turnaround against the neighbouring street." |

## Stage logistics

- Pre-warm: seed script run, one shop bound to the presenter's Telegram,
  playbooks cached, one confirmed loss report ready to open.
- The demo path (dashboard → console → phone → report) needs **only the
  deployed app + one phone**; no live InfoBanjir, no AI, no venue wifi beyond
  the phone's own data for Telegram.
- Backup: screen-recording of the full arc. Joke ready: "our demo's critical
  path doesn't depend on live wifi either."
