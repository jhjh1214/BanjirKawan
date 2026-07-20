# BanjirKawan — PPTX Generation Spec (for an AI agent to build the deck)

**Goal:** produce `BanjirKawan.pptx` — a polished, consistent 10-slide, 16:9 deck
for a 5-minute online pitch. This spec is self-contained: exact text, coordinates
(inches), font sizes (pt), colours (RGB), diagram shapes, and speaker notes. Build
it with **python-pptx**. Follow the coordinates and palette exactly; do not
improvise layout. Where an asset (video/screenshot) isn't available, drop a labelled
placeholder rectangle at the given box so it can be swapped in later.

---

## 0. Global setup

```python
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.shapes import MSO_CONNECTOR
from pptx.oxml.ns import qn

prs = Presentation()
prs.slide_width  = Inches(13.333)   # 16:9
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]        # blank layout for full control
```

### Palette (RGB)
| Name | Hex | RGB |
|---|---|---|
| INK | `#0F172A` | (15, 23, 42) |
| SECONDARY | `#475569` | (71, 85, 105) |
| ACCENT | `#0284C7` | (2, 132, 199) |
| ACCENT_LIGHT | `#0EA5E9` | (14, 165, 233) |
| BG | `#FFFFFF` | (255, 255, 255) |
| BG_SOFT | `#F8FAFC` | (248, 250, 252) |
| CARD_BORDER | `#E2E8F0` | (226, 232, 240) |
| GREEN | `#16A34A` | (22, 163, 74) |
| YELLOW | `#EAB308` | (234, 179, 8) |
| ORANGE | `#F97316` | (249, 115, 22) |
| RED | `#DC2626` | (220, 38, 38) |

### Typography
- Font family: **Calibri** (or Inter if embedding is set up). Apply to every run.
- Sizes: H1 headline **40pt bold**; big-number **54–72pt bold**; subhead **24pt**;
  body **20pt**; card title **20pt bold**; caption **15pt**; footer **11pt**.
- Headline colour INK; accents in ACCENT; secondary text SECONDARY.

### Helper conventions (implement these once, reuse everywhere)
- `add_bg(slide, color=BG)` — full-bleed rectangle, no line, sent to back.
- `add_text(slide, l, t, w, h, text, size, color=INK, bold=False, align=LEFT, anchor=TOP, font="Calibri")` — textbox; set `word_wrap=True`.
- `add_headline(slide, text)` — textbox at **L=0.6, T=0.45, W=12.13, H=0.9**, 40pt bold INK.
- `add_accent_bar(slide, l, t, w, h=0.09, color=ACCENT)` — thin filled rectangle, no line.
- `add_card(slide, l, t, w, h, fill=BG_SOFT, border=CARD_BORDER, radius=True)` —
  rounded rectangle (`MSO_SHAPE.ROUNDED_RECTANGLE`), 1pt border, subtle.
- `add_footer(slide)` — 11pt SECONDARY at L=0.6, T=7.05, "BanjirKawan · Climate Systems Hackathon 2026".
- `set_notes(slide, text)` — write the **SAY** script into `slide.notes_slide.notes_text_frame`.
- Rounded-rect radius: after creating, set `shape.adjustments[0] = 0.06`.
- Every slide: call `add_bg()` first (white), then content, then `add_footer()` (except title).

**Global rules:** left margin 0.6", right edge 12.73" (so content width 12.13").
One idea per slide. No emojis, no clip-art. Keep the theme light.

---

## SLIDE 1 — Title
`slide = prs.slides.add_slide(BLANK)`; `add_bg(slide, BG_SOFT)`.
- **Wordmark:** add_text at L=0.6, T=2.7, W=12.13, H=1.2 — "BanjirKawan", **60pt bold**, ACCENT, align CENTER.
- **Subtitle:** L=1.5, T=3.95, W=10.33, H=0.9 — *"Turning flood warnings into shop-level survival plans — and survival plans into claim evidence."*, 22pt, SECONDARY, align CENTER, italic.
- **Credits:** L=1.5, T=5.0, W=10.33, H=0.5 — "Problem 1  ·  Team of 3 — [Name], [Name], [Name]", 15pt, SECONDARY, align CENTER.
- No footer on the title slide.
- **Notes:** "(No speech on the title — go straight into the hook on Slide 2.)"

## SLIDE 2 — The person and the gap
`add_bg(slide)`. Headline: **"The warning existed. It never reached her shop floor."**
- **Left card** at L=0.6, T=1.7, W=5.6, H=4.4 (fill BG_SOFT, rounded):
  - L+0.4, T+0.5: "Kak Ros" 26pt bold INK; next line "kedai runcit · Taman Sri Muda" 18pt SECONDARY.
  - Centre of card: "−RM 40,000" **60pt bold** RED; caption below "December 2021" 16pt SECONDARY.
- **Right column**, three stacked lines at L=6.7, W=5.9:
  - T=1.9: "1  The warning was published." 24pt INK.
  - T=2.9: "2  It reached an agency dashboard." 24pt INK.
  - T=3.9: "3  It never reached her shop floor." 24pt **bold RED**.
- **Bottom strip:** add_accent_bar at L=0.6, T=6.4, W=12.13, H=0.5, color=ACCENT; overlay text (white, 18pt italic, centered): *"A warning only helps if people can act."*
- **Notes:** SLIDE-2 SAY (below in §Speaker notes).

## SLIDE 3 — The system map  ← ANCHOR (build this carefully)
`add_bg(slide)`. Headline: **"One broken link — the last metre"**.
Build a left-to-right flow. Use `MSO_SHAPE.ROUNDED_RECTANGLE` boxes (H=0.8 each) and
`MSO_CONNECTOR.STRAIGHT` arrows. **Upstream boxes** fill ACCENT_LIGHT (white text);
**downstream boxes** fill (226,232,240) grey with INK text.

Row Y for boxes: **T=2.2**. Boxes (L, W):
1. "Rain" — L=0.6, W=1.2 (ACCENT_LIGHT)
2. "Rivers" — L=2.0, W=1.3 (ACCENT_LIGHT)
3. "JPS telemetry\n~200 stations · thresholds" — L=3.5, W=2.6 (ACCENT_LIGHT), 16pt
4. "Agency dashboard" — L=6.3, W=2.0 (ACCENT_LIGHT)

Then **THE LAST METRE** red dashed arrow from x≈8.3 to x≈9.2 at same Y:
- Draw a thick line/arrow (`MSO_CONNECTOR.STRAIGHT`, weight 3.5pt, color RED, dash).
  Set dash via XML: `ln.prstDash val="dash"`. Add arrowhead.
- Label above it at L=7.9, T=1.55, W=2.4, H=0.5: "THE LAST METRE" 15pt **bold RED**, centered.
- Add a red oval glow (`MSO_SHAPE.OVAL`, no fill, 2.5pt RED line) around the arrow region (L=7.8, T=1.9, W=2.6, H=1.4).

Downstream boxes (grey), continuing right, T=2.2:
5. "Shop floor" — L=9.3, W=1.5
6. "Owner action" — L=9.3, T=3.2, W=1.5  *(stack the downstream chain vertically if horizontal space runs out — see note)*

**Layout note:** if 6 downstream boxes don't fit horizontally, place boxes 5–8 as a
**vertical stack on the right** (L≈11.0, W=2.1, H=0.7, T=2.0/2.85/3.7/4.55):
"Shop floor" → "Owner action" → "Damage / Claim" → "Loan / Recovery", joined by
down-arrows. Cleaner than cramming. Downstream = grey fill, INK text.

- **Callout under the red arrow:** add_text L=6.8, T=5.9, W=6.0, H=0.7:
  "Highest leverage · Lowest cost · Our intervention point" 18pt bold ACCENT.
- **Iceberg inset** (bottom-left), 4 stacked thin rectangles at L=0.6, W=3.4, H=0.42 each,
  T=4.4/4.85/5.3/5.75, labels "Event / Pattern / Structure / Mental model" 13pt;
  top one ACCENT_LIGHT, deeper ones darker ACCENT/INK; small caption "Iceberg" 12pt SECONDARY above.
- **Notes:** SLIDE-3 SAY.

## SLIDE 4 — Weather to wallet (and the market)
`add_bg(slide)`. Headline: **"A flood isn't water — it's money"**.
- **Chain of 4 pills** at T=1.8, H=0.7, each rounded rect fill ACCENT, white 18pt bold,
  with "→" between: "Weather event"(L=0.6,W=2.6) → "What's hit"(L=3.5,W=2.4) →
  "Effect"(L=6.2,W=2.0) → "Cost"(L=8.5,W=2.0). Add small ACCENT arrows between.
- **Four effect cards** at T=3.0, H=1.5, W=2.85 each, L=0.6/3.55/6.5/9.45 (BG_SOFT rounded):
  card titles 18pt bold INK — "Damaged goods", "Lost sales (days shut)", "Cleanup costs",
  "Costlier loan"; subcaption on card 4: "no evidence → claim denied" 14pt RED.
- **Big number** bottom: add_text L=0.6, T=5.0, W=12.13, H=1.2:
  "RM 6.1 billion" **60pt bold** INK, centered; caption below (16pt SECONDARY, centered):
  "national flood losses, Dec 2021 — the market we address".
- **Notes:** SLIDE-4 SAY.

## SLIDE 5 — How it works (the design principle)
`add_bg(slide)`. Headline: **"AI is never in the storm path"** (make "never" ACCENT).
- **Left panel** (Dry day) card L=0.6, T=1.9, W=5.7, H=3.2, fill=(224,242,254) light-blue:
  title "DRY DAY — AI thinks" 20pt bold ACCENT; body 18pt INK:
  "5 photos → asset risk map → owner confirms → cached tiered playbooks".
- **Right panel** (Storm day) card L=7.03, T=1.9, W=5.7, H=3.2, fill=(241,245,249) grey:
  title "STORM DAY — dumb & deterministic" 20pt bold INK; body 18pt:
  "threshold → cache lookup → send".
- **Divider + ribbon:** vertical line at x=6.66 T=1.9→5.1 (1.5pt CARD_BORDER). A ribbon
  rounded-rect across the seam at L=3.4, T=3.25, W=6.5, H=0.7, fill ACCENT, white 18pt bold
  centered: "AI is never in the storm path".
- **After strip:** card L=0.6, T=5.4, W=12.13, H=1.0, fill BG_SOFT: 18pt INK:
  "After the flood: 5 photos → claim report (evidence = river authority telemetry)".
- **Notes:** SLIDE-5 SAY.

## SLIDE 6 — It's already built (proof / traction)
`add_bg(slide)`. Headline: **"Not a concept — deployed, on real data"**.
- **Video placeholder / video** centre-left: rounded rect L=0.6, T=1.8, W=7.0, H=4.3,
  fill=(15,23,42) INK. If the MP4 is available, add it with
  `slide.shapes.add_movie(path, Inches(0.6), Inches(1.8), Inches(7.0), Inches(4.3), poster_frame_image=poster)`.
  Else overlay white 20pt centered text: "[ 15–20s recording: SIMULATE FLOOD → phone buzz → checklist → dashboard tick ]".
- **Caption under video** T=6.2, 15pt SECONDARY: "301 live river stations · 2 real escalations caught this week".
- **Three stills** stacked right, L=7.9, W=4.8, H=1.25 each, T=1.8/3.2/4.6 (rounded, BG_SOFT
  or the screenshot image). Captions 13pt: "Live danger map", "Claim report — evidence = JPS telemetry", "Metrics dashboard". If images unavailable, leave labelled placeholder rects.
- **Notes:** SLIDE-6 SAY.

## SLIDE 7 — The business  ← ANCHOR
`add_bg(slide)`. Headline: **"B2B2C — and the shop is the smallest payer"**.
- **Three payer cards** at T=1.8, H=3.0:
  - Card 1 (ANCHOR, emphasise): L=0.6, W=4.0, fill=(224,242,254), **2.5pt ACCENT border**.
    Title "Insurers / takaful" 22pt bold ACCENT; tag "ANCHOR" 12pt white on ACCENT pill;
    body 16pt INK: "Completed checklist = claim avoided. Verified report = claim in minutes,
    not adjuster-weeks. Priced per policy / per claim avoided."
  - Card 2: L=4.75, W=3.9, BG_SOFT. Title "State & local councils" 20pt bold INK; body 16pt:
    "District-wide SME resilience at software cost."
  - Card 3: L=8.8, W=3.93, BG_SOFT. Title "Kedai — freemium" 20pt bold INK; body 16pt:
    "Basic alerts free. Plan + claim features "; then "RM 19 / month" 20pt bold ACCENT.
- **Bottom band — 3 economics chips** at T=5.2, H=1.3, W=3.9 each, L=0.6/4.75/8.8 (rounded, border):
  1. "Marginal cost / shop / flood ≈ 0" bold + "one dry-day AI call, then DB lookup + one message" 14pt.
  2. "Data moat" bold + "site graphs + behavioural completion data nobody else has" 14pt.
  3. "Go to market" bold + "one takaful + one council pilot, measured vs the next street" 14pt.
- **Notes:** SLIDE-7 SAY.

## SLIDE 8 — Impact, measured
`add_bg(slide)`. Headline: **"We measure impact, not adjectives"**.
- **3×2 grid of metric tiles.** Tile W=3.7, H=1.7, gap 0.25. Columns L=0.6/4.55/8.5;
  rows T=1.9 and T=3.85. Each tile = rounded rect BG_SOFT; big number 40pt bold ACCENT
  (top), label 16pt SECONDARY (below):
  - "RM 10,600–22,200" / "protected per event"
  - "3h 12m" / "warning lead time"
  - "2.0s" / "dispatch latency"
  - "83%" / "actions completed"
  - "90s" / "to first action"
  - "4 min" / "claim report (vs weeks)"
- **Footer line** T=5.8, 18pt INK centered: "The numbers a takaful actuary and a council underwrite against."
- **Notes:** SLIDE-8 SAY.

## SLIDE 9 — Resilient as a system  ← ANCHOR
`add_bg(slide)`. Headline: **"Built as a system, not an app"**.
- **Two loop badges** top-left, each a rounded rect W=5.8, H=1.15, L=0.6, T=1.8/3.1:
  - Loop 1 fill=(220,252,231) light-green: "BALANCING" 14pt bold GREEN +
    "completed checklists → better playbooks (learns each monsoon)" 16pt INK.
  - Loop 2 fill=(224,242,254) light-blue: "REINFORCING" 14pt bold ACCENT +
    "paid claims → trust → more shops (grows from use)" 16pt INK.
  Optional: a small circular-arrow icon (`MSO_SHAPE.CIRCULAR_ARROW`) on each.
- **Worst-day table** right, a real table `slide.shapes.add_table(4, 2, L=6.7, T=1.8, W=6.0, H=2.6)`:
  header row "If… | Then…" (ACCENT fill, white bold 14pt); rows:
  - "Data feed dies" | "Watchdog: treat heavy rain as a warning"
  - "Network dies" | "Earliest tier fired hours early + paper plan"
  - "Floods double" | "Marginal cost ≈ 0 — plans already cached"
  Body 13pt INK, white cell fill, thin borders.
- **Channels strip** bottom: accent bar L=0.6, T=5.9, W=12.13, H=0.6, ACCENT; white 18pt bold centered:
  "3 channels — Telegram · SMS · Paper. No single point of failure."
- **Notes:** SLIDE-9 SAY.

## SLIDE 10 — It transfers + close
`add_bg(slide, BG_SOFT)`. Headline: **"Same monsoon. Same last-metre gap. Same fix."**
- **SEA pins row** (simple, no real map needed): four rounded pills at T=2.0, H=0.8, W=2.7,
  L=0.6/3.35/6.1/8.85, fill ACCENT_LIGHT white 18pt bold centered:
  "Shah Alam", "Johor", "Jakarta", "Medan / Bukit Lawang". Caption below (T=3.0, 15pt
  SECONDARY, centered): "Same monsoon, same last-metre gap, same fix, same three payers."
- **Close line:** add_text L=1.0, T=3.9, W=11.33, H=1.6, centered, **30pt bold** ACCENT:
  "Every flood warning becomes a survival plan — and every survival plan becomes claim evidence."
- **Sign-off:** T=5.8, 20pt SECONDARY centered: "BanjirKawan · Terima kasih".
- **Notes:** SLIDE-10 SAY.

---

## Speaker notes (paste verbatim into each slide's notes via `set_notes`)

- **Slide 2:** "December 2021. Kak Ros runs a kedai runcit in Taman Sri Muda. The government's river station — two-point-nine kilometres away — crossed WARNING at two in the afternoon. The warning was published. She lost forty thousand ringgit anyway. Not because the warning didn't exist — because nobody translated 'river at warning' into her freezer, her rice sacks, her next three hours. The brief asks us to keep one place running when the weather turns bad. We picked the flood-prone kedai — and we found why the warnings already there don't help."
- **Slide 3:** "So we mapped the system. Rain feeds rivers; Malaysia has world-class telemetry — around two hundred live river stations with published danger thresholds. That data reaches an agency dashboard — and then it stops. Between the river gauge and the shop floor is a gap we call the last metre. Everything upstream is solved and expensive. Everything downstream — a flooded shop, a denied claim, a panic loan — flows from this one broken link. On the iceberg: the event is a flooded shop; the pattern is the same shops flooding every monsoon despite warnings; the structure is warnings that are river-centric with no shop-level translation and no evidence trail; the mental model is 'banjir is fate.' The brief's own question is 'what if floods double?' — they will, and every extra flood widens exactly this gap. So the last metre is our intervention point: the highest-leverage, lowest-cost place in the whole system."
- **Slide 4:** "And a flood isn't water, it's money. The chain: weather event, what's hit, effect, cost. Water reaches her floor-level freezer and stock and triggers all four money effects at once — damaged goods, lost sales while she's shut, cleanup costs, and a costlier loan because with no evidence her claim is denied. December 2021 was six-point-one billion ringgit nationally. Every ringgit started as a shop like hers — and that RM 6.1 billion is the market we're addressing."
- **Slide 5:** "BanjirKawan. The design principle answers the brief's own systems angle — 'the fix needs power, phones and roads too' — so the AI is never in the storm path. On a dry day, AI vision turns five phone photos into a risk map of every asset — its height off the floor, its ringgit value — and the owner confirms it, so nothing is hallucinated. We pre-compute tiered action playbooks and cache them. When the flood comes, the alert path is dumb, deterministic code — threshold, cache lookup, send. And after the flood, five photos become an itemised claim report whose evidence is the river authority's own telemetry."
- **Slide 6:** "And this isn't a concept — we've built and deployed it. It's monitoring 301 real river stations, it's already caught two real escalations this week, and here's a warning firing to a shop owner's phone and the action ticking off, live. Built product, real data — that de-risks everything I'm about to say about the business."
- **Slide 7:** "The business. It's B2B2C, and the systems view hands us three payers — and the shop is the smallest of them. One, insurers and takaful — this is the anchor. A completed checklist is a claim that never happens; a verified, telemetry-backed report is a claim that costs minutes instead of adjuster-weeks. We sell risk reduction and faster, cheaper claims — priced per policy or per claim avoided. Two, state and local councils — flood resilience for their SMEs at software cost, a whole district for a rounding error in a disaster budget. Three, the kedai, freemium at nineteen ringgit a month. And the economics are the point: onboarding uses one AI call on a dry day, and every storm-time alert after that is a database lookup and one message — the marginal cost per shop per flood is effectively zero. So it scales to the whole six-point-one-billion problem without cost scaling with it. And it compounds: every shop builds a data moat — site graphs and behavioural data no competitor and no government dashboard has. We go to market through one takaful partner and one council pilot — a single flood-prone street, measured against the street next to it."
- **Slide 8:** "And we measure impact, not adjectives — these are pulled live from our running system: RM 10,600 to 22,200 protected in a single event, a three-hour-twelve-minute warning window, 83% of actions completed, first action in 90 seconds, and a claim report produced in four minutes versus weeks by hand. Those are the numbers a takaful actuary and a council both underwrite against."
- **Slide 9:** "Three things make this a resilient system, not just an app. Feedback loops: every completed checklist teaches us which actions owners actually take — a balancing loop that tightens the playbook each monsoon; every claim we get paid builds the trust that brings the next shop in — a reinforcing loop. It gets smarter and bigger from use. Designed for the worst day, not the average: feed dies, a watchdog tells every shop to treat heavy rain as a warning; network dies, the earliest tier already fired hours before the water, and there's a laminated plan on the wall. That's the brief's power-phones-roads point answered with three channels — Telegram, SMS, and paper. No single point of failure decides whether Kak Ros acts."
- **Slide 10:** "One place. One broken link — the last metre. One intervention, and we've already built it, deployed it, and put a business around it. Every flood warning becomes a shop's personal survival plan, and every survival plan becomes its claim evidence. The rivers are already telling us. BanjirKawan makes sure Kak Ros hears it in time — and gets paid after. Terima kasih."

---

## Assets (optional — swap in if available, else placeholders)
- `assets/demo.mp4` — 15–20s recording for Slide 6 (SIMULATE FLOOD → phone buzz → checklist → dashboard tick).
- `assets/map.png`, `assets/report.png`, `assets/metrics.png` — Slide 6 stills (light mode, seeded data).
- If any asset is missing, render the labelled placeholder rectangle at the specified box; do not shift the layout.

## Numbers to get exactly right (spell-check these)
RM 40,000 · RM 6.1 billion · RM 10,600–22,200 · 3h 12m · 2.0s · 83% · 90s · 4 min ·
301 stations · 2 real escalations · RM 19/month · ~200 stations (context) · Dec 2021.

## Output
Save as `BanjirKawan.pptx`. Verify: 10 slides, 16:9, every slide has a headline,
a footer (except Slide 1), and speaker notes populated. Anchor slides (3, 7, 9) are
the most visually built. Keep everything on the light theme.
```
prs.save("BanjirKawan.pptx")
```
