# BanjirKawan — Money & Funding Notes (pitch backing)

All figures below come from the seeded demo dataset (`npm run seed:demo` —
a realistic 12-asset Klang Valley kedai runcit) and the live metrics engine,
so every number quoted on stage can be shown live in the product.

---

## 1 · Who pays (three nameable customers)

| Payer | One-line logic | Model |
|---|---|---|
| **Takaful / insurance operators** | A completed checklist is a claim that never happens; a verified evidence report is a claim that costs minutes, not adjuster-weeks, and resists fraud (independent JPS telemetry + timestamped before/after photos). | White-label / per-policy fee; loss-ratio share |
| **State DID / majlis perbandaran** | Per-shop flood resilience at software cost vs. hardware cost — one bund costs more than protecting every shop in the district digitally. Completion telemetry gives agencies the first ground-truth data on whether warnings produce action. | Per-district licence |
| **The kedai itself** | Alerts free forever (adoption is the moat); the claims pack — evidence baseline, loss report, playbook refresh — at ~RM19/month, less than one hour of flood losses. | Freemium subscription |

The wedge order matters: free alerts build the completion telemetry → the
telemetry is the sales asset for insurers/agencies → their subsidy makes the
paid tier optional for the poorest shops (equity loop).

## 2 · The four money effects, mapped to the product

| Effect | How the flood causes it | What BanjirKawan does | Demo number (seeded kedai) |
|---|---|---|---|
| **Damaged stuff** | 80cm of water reaches everything below waist height | Checklist moves the movable, kills the mains before shorting | **RM 10,600–22,200 protected** (5/6 actions completed) |
| **Fewer sales** | Shop closed for cleanup + equipment replacement lead-time | Less damage = fewer replacement lead-times; power cut safely = wiring intact = faster reopen | Reopen days-sooner instead of weeks |
| **Higher costs** | Spoiled stock disposal, rewiring, emergency purchases at panic prices | Stock lifted in time isn't disposal cost; DB box switched off is not a rewiring job | Cleanup scope shrinks with every checked item |
| **Costlier loans / insurance** | No evidence → denied/shrunk claims → bridge borrowing at retail rates | Claims-grade loss report in **minutes** (median photos→report on the dashboard) vs. weeks of paperwork; under-insurance surfaced by the surveyed asset values | Report generated same-day; payout cycle starts immediately |

## 3 · One worked example (chain it on stage)

> **Weather:** monsoon trough parks over the Klang Valley; Sg. Damansara at
> TTDI Jaya crosses WARNING at 2:00pm.
> **What's in the water's path:** the seeded kedai's floor level —
> chest freezer + display chiller (RM 8,000–14,000), rice/oil/snack stock
> (RM 3,500–7,000), counter and shelving (RM 2,400–4,300), CCTV DVR at 25cm.
> **Without BanjirKawan:** ~RM 14,500–26,500 exposed, plus weeks closed,
> plus a claim with no evidence.
> **With it:** checklist lands at 2:00:02pm (2.1s dispatch). Owner completes
> 5 of 6 actions (83%), first action within 90 seconds. **RM 10,600–22,200
> protected.** Water hits DANGER at 5:12pm — the system bought **3h 12m of
> usable lead time**. Two weeks later the takaful claim is filed with a
> report generated in minutes, backed by JPS's own telemetry.
> Every number in that story is on the dashboard right now.

## 4 · Cost side (why the unit economics hold)

- Marginal cost per flood event ≈ RM0 (cache lookup + one Telegram API call).
- AI cost per shop ≈ one vision survey + 6 playbook generations + rare
  refreshes — pennies even at paid-tier Gemini rates; free tier covers a pilot.
- The expensive asset (behavioural telemetry) accrues automatically in the
  dispatch audit trail — zero collection cost.
