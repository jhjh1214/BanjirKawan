# Brief for Gemini — Build the BanjirKawan pitch deck (.pptx)

You are an expert presentation designer. **Build a finished PowerPoint file —
`BanjirKawan.pptx`, 11 slides, 16:9 — and return it to me as a downloadable file.**
Do not show me any code, and do not explain your process. Just produce the deck
itself, ready to open in PowerPoint / Google Slides, with all text editable (real
text boxes and shapes, not images of slides).

**Two rules that override everything else:**
1. **ACCURACY IS ABSOLUTE.** Every word, number, and label in the "CONTENT" of each
   slide below is final. Do **not** paraphrase, round, translate, "improve," or drop
   anything. Numbers especially are immutable (see the Accuracy Lock at the end).
2. **MAKE IT BEAUTIFUL.** Within the content lock you have full creative latitude on
   layout, spacing, color weighting, shapes, and polish. Aim for a clean, modern,
   editorial look — the quality of a top consulting or startup pitch deck. Generous
   whitespace, strong typographic hierarchy, perfect alignment, no clutter, no emojis,
   no clip-art, no stock photos.

This deck is screen-shared over Zoom for a 5-minute pitch at a **systems-thinking**
competition, so clarity and restraint beat decoration. Put the provided **speaker
notes** into each slide's notes field verbatim.

---

## DESIGN SYSTEM (apply consistently to all slides)

- **Canvas:** 16:9, `Inches(13.333) x Inches(7.5)`, blank layout (`slide_layouts[6]`).
- **Palette (use these exact hexes):**
  - Ink/text `#0F172A`; secondary text `#475569`
  - Accent (brand blue) `#0284C7`; light accent `#0EA5E9`
  - Backgrounds: white `#FFFFFF`, soft `#F8FAFC`; card border `#E2E8F0`
  - Light fills: light-blue `#E0F2FE`, light-grey `#F1F5F9`, light-green `#DCFCE7`, light-red `#FEF2F2`
  - Semantic: green `#16A34A`, red `#DC2626`
- **Type:** one clean sans (Calibri, or Inter/Segoe UI if available), applied to every
  run. Headline 40pt bold; big numbers 48–60pt bold; subhead 22–24pt; body 16–18pt;
  card titles 18–20pt bold; captions 12–14pt. Never below 12pt.
- **Style rules:** one idea per slide; rounded-rectangle cards with subtle 1pt borders
  (no heavy drop shadows); use color sparingly — accent for emphasis, semantic red for
  the "vicious/loss" content only; align everything to a consistent left margin
  (~0.6in) and a 12.13in content width; footers 11pt secondary reading
  "BanjirKawan · Climate Systems Hackathon 2026" on every slide except the title.
- **Diagrams** (slides 3, 5, 9) are the visual centerpieces — invest the most polish
  there. Use connectors with arrowheads; dash the "last metre" arrow in red.

---

## SLIDES

For each slide: **CONTENT** = locked text to place; **LAYOUT** = how to arrange it;
**NOTES** = speaker notes to paste into the notes field.

### Slide 1 — Title
**CONTENT**
- Title: `BanjirKawan`
- Subtitle: `Turning flood warnings into shop-level survival plans — and survival plans into claim evidence.`
- Credits: `Problem 1  ·  Team of 3 — [Name], [Name], [Name]`

**LAYOUT** Centered, soft background. Brand-blue wordmark, large. Subtitle in
secondary/italic beneath. Minimal — no footer.
**NOTES** `(No speech on the title — go straight into the hook on Slide 2.)`

### Slide 2 — The person and the gap
**CONTENT**
- Headline: `The warning existed. It never reached her shop floor.`
- Left card: `Kak Ros` / `kedai runcit · Taman Sri Muda` / big red `−RM 40,000` / `December 2021`
- Right, three numbered lines: `1  The warning was published.` · `2  It reached an agency dashboard.` · `3  It never reached her shop floor.` (make line 3 bold red)
- Accent strip along the bottom: `“A warning only helps if people can act.”` (white italic on accent)

**LAYOUT** Two columns: a soft card on the left with the big red loss figure; the
three lines stacked on the right with #3 emphasized. Full-width accent strip footline.
**NOTES** `December 2021. Kak Ros runs a kedai runcit in Taman Sri Muda. The government's river station — two-point-nine kilometres away — crossed WARNING at two in the afternoon. The warning was published. She lost forty thousand ringgit anyway. Not because the warning didn't exist — because nobody translated 'river at warning' into her freezer, her rice sacks, her next three hours. The brief asks us to keep one place running when the weather turns bad. We picked the flood-prone kedai — and we found why the warnings already there don't help.`

### Slide 3 — The system map  (ANCHOR — most design care)
**CONTENT**
- Headline: `One broken link — the last metre`
- Upstream chain (blue boxes, white text, left→right): `Rain` → `Rivers` → `JPS telemetry — ~200 stations · thresholds` → `Agency dashboard`
- A thick **red dashed arrow** labelled `THE LAST METRE`, with a red highlight ring
- Downstream chain (grey boxes, ink text — arrange as a right-side vertical stack joined by down-arrows): `Shop floor` → `Owner action` → `Damage / Claim` → `Loan / Recovery`
- Callout: `Highest leverage · Lowest cost · Our intervention point`
- Iceberg inset (small, four stacked layers): `Event` / `Pattern` / `Structure` / `Mental model`

**LAYOUT** Horizontal upstream flow (blue = "solved & expensive"), then the red dashed
"last metre" arrow with a ring around it, then the grey downstream stack (= "where the
loss happens"). Callout in accent under the arrow. Iceberg small in a lower corner.
**NOTES** `So we mapped the system. Rain feeds rivers; Malaysia has world-class telemetry — around two hundred live river stations with published danger thresholds. That data reaches an agency dashboard — and then it stops. Between the river gauge and the shop floor is a gap we call the last metre. Everything upstream is solved and expensive. Everything downstream — a flooded shop, a denied claim, a panic loan — flows from this one broken link. On the iceberg: the event is a flooded shop; the pattern is the same shops flooding every monsoon despite warnings; the structure is warnings that are river-centric with no shop-level translation and no evidence trail; the mental model is 'banjir is fate.' The brief's own question is 'what if floods double?' — they will, and every extra flood widens exactly this gap. So the last metre is our intervention point: the highest-leverage, lowest-cost place in the whole system.`

### Slide 4 — Weather to wallet (and the social cost)
**CONTENT**
- Headline: `A flood isn't water — it's money`
- Chain of four pills (accent, white): `Weather event` → `What's hit` → `Effect` → `Cost`
- Four effect cards: `Damaged goods` · `Lost sales (days shut)` · `Cleanup costs` · `Costlier loan` (on the loan card add small red subtext: `no evidence → claim denied`)
- Big number: `RM 6.1 billion` with caption `national flood losses, Dec 2021 — the market we address`
- Accent strip (white italic): `… but each ringgit is also a livelihood, a job, a family's debt — social costs that hit the most vulnerable hardest.`

**LAYOUT** Chain pills row on top; four equal effect cards; oversized RM figure centered;
the social-cost accent strip as the final band above the footer.
**NOTES** `And a flood isn't water, it's money. The chain: weather event, what's hit, effect, cost. Water reaches her floor-level freezer and stock and triggers all four money effects at once — damaged goods, lost sales while she's shut, cleanup costs, and a costlier loan because with no evidence her claim is denied. December 2021 was six-point-one billion ringgit nationally — that's the market. But the money effects don't stop at money. Each ringgit is also a livelihood, a job, a family pushed into debt, a neighbourhood that loses its only shop. And they land hardest on those least able to absorb them — the uninsured, the informal, women-run micro-businesses like Kak Ros.`

### Slide 5 — How it works: the design principle + the four capacities  (ANCHOR)
**CONTENT**
- Headline: `AI is never in the storm path`
- Left panel (light-blue): title `DRY DAY — AI thinks`; body `5 photos → asset risk map → owner confirms → cached tiered playbooks`
- Right panel (light-grey): title `STORM DAY — dumb & deterministic`; body `threshold → cache lookup → send`
- Ribbon across the seam (accent, white): `AI is never in the storm path`
- A row of four capacity cards (accent titles), joined by `→`:
  - `Anticipate` / `dry-day survey + early warning`
  - `Absorb` / `ranked action playbook`
  - `Adapt` / `learning loop each monsoon`
  - `Recover` / `claim report → bounce forward`
- Bottom italic line: `Built WITH the community: AI proposes, the owner confirms every asset — participatory by design (Climate-U co-creation).`

**LAYOUT** Two panels side by side with the accent ribbon crossing them; beneath, the
four capacity cards in one row connected by arrows; the participatory line as a centered
italic caption above the footer.
**NOTES** `BanjirKawan. The design principle answers the brief's systems angle — the fix needs power, phones and roads too — so the AI is never in the storm path. On a dry day, AI vision turns five photos into a risk map of every asset, and — this matters — the owner confirms and corrects every one. It's participatory: built with the community, not imposed on it, which is the Climate-U co-creation value. We cache tiered playbooks. When the flood comes, the alert path is dumb, deterministic code — threshold, cache lookup, send. And notice the shape of the whole thing — it's the four resilience capacities: we help shops Anticipate with early warning, Absorb with a ranked playbook, Adapt through a learning loop that sharpens each monsoon, and Recover with a telemetry-backed claim report that lets them bounce forward, not just back.`

### Slide 6 — It's already built (proof / traction)
**CONTENT**
- Headline: `Not a concept — deployed, on real data`
- Large media placeholder (dark rounded rectangle) labelled: `[ 15–20s recording: SIMULATE FLOOD → phone buzz → checklist → dashboard tick ]`
- Caption under it: `301 live river stations · 2 real escalations caught this week`
- Three small stills with captions: `Live danger map` · `Claim report — evidence = JPS telemetry` · `Metrics dashboard`

**LAYOUT** A big media placeholder on the left (a real video will be dropped in later —
leave a clean dark rounded rectangle with the label centered), three captioned
placeholder stills stacked on the right.
**NOTES** `And this isn't a concept — we've built and deployed it. It's monitoring 301 real river stations, it's already caught two real escalations this week, and here's a warning firing to a shop owner's phone and the action ticking off, live. Built product, real data — that de-risks everything I'm about to say about the business.`

### Slide 7 — The business  (ANCHOR)
**CONTENT**
- Headline: `B2B2C — and the shop is the smallest payer`
- Card 1 (emphasize with an accent border + an `ANCHOR` tag): `Insurers / takaful` — `Completed checklist = claim avoided. Verified report = claim in minutes, not adjuster-weeks. Priced per policy / per claim avoided.`
- Card 2: `State & local councils` — `District-wide SME resilience at software cost.`
- Card 3: `Kedai — freemium` — `Basic alerts free. Plan + claim features paid.` + big accent `RM 19 / month`
- Bottom row of three chips:
  - `Marginal cost / shop / flood ≈ 0` — `one dry-day AI call, then DB lookup + one message`
  - `Data moat` — `site graphs + behavioural completion data nobody else has`
  - `Go to market` — `one takaful + one council pilot, measured vs the next street`

**LAYOUT** Three payer cards across the top (card 1 visually strongest / accent border);
three economics chips along the bottom.
**NOTES** `The business. It's B2B2C, and the systems view hands us three payers — and the shop is the smallest of them. One, insurers and takaful — this is the anchor. A completed checklist is a claim that never happens; a verified, telemetry-backed report is a claim that costs minutes instead of adjuster-weeks. We sell risk reduction and faster, cheaper claims — priced per policy or per claim avoided. Two, state and local councils — flood resilience for their SMEs at software cost, a whole district for a rounding error in a disaster budget. Three, the kedai, freemium at nineteen ringgit a month. And the economics are the point: onboarding uses one AI call on a dry day, and every storm-time alert after that is a database lookup and one message — the marginal cost per shop per flood is effectively zero. So it scales to the whole six-point-one-billion problem without cost scaling with it. And it compounds: every shop builds a data moat — site graphs and behavioural data no competitor and no government dashboard has. We go to market through one takaful partner and one council pilot — a single flood-prone street, measured against the street next to it.`

### Slide 8 — Impact, measured
**CONTENT**
- Headline: `We measure impact, not adjectives`
- Six metric tiles (big accent number + secondary label):
  - `RM 10,600–22,200` / `protected per event`
  - `3h 12m` / `warning lead time`
  - `2.0s` / `dispatch latency`
  - `83%` / `actions completed`
  - `90s` / `to first action`
  - `4 min` / `claim report (vs weeks)`
- Footer line: `The numbers a takaful actuary and a council underwrite against.`

**LAYOUT** A clean 3×2 grid of equal tiles.
**NOTES** `And we measure impact, not adjectives — these are pulled live from our running system: RM 10,600 to 22,200 protected in a single event, a three-hour-twelve-minute warning window, 83% of actions completed, first action in 90 seconds, and a claim report produced in four minutes versus weeks by hand. Those are the numbers a takaful actuary and a council both underwrite against.`

### Slide 9 — Root cause, not symptom  (ANCHOR — systems)
**CONTENT**
- Headline: `Root cause, not symptom`
- Archetype block titled `“Shifting the Burden” archetype`, with two small boxes: `Symptom fix: relief + loans (after)` vs `Fundamental: anticipation (before)`; caption `Leaning on the quick fix lets real resilience wither.`
- Vicious loop block (light-red), title (red) `Vicious cycle (reinforcing)`: `flood → loss → debt → thinner buffer → next flood worse → closure / displacement → the neighbourhood loses its shop`; red subline `Falls first on those least able to absorb it — uninsured, informal, women-run micro-shops.`
- Virtuous block (light-blue), title (accent) `We shift the intervention upstream — and reverse the loop`: `early warning → action → less loss → telemetry-backed evidence → faster payout → trust → more shops protected → better data → better playbooks`; accent subline `Same loop, run the other way. That is the leverage point.`

**LAYOUT** Left column: archetype box (top) + vicious cycle (bottom, tinted red). Right
column: the virtuous loop (tinted blue), visually larger/brighter to signal the "fix."
Consider a curved/looping arrow motif to reinforce "reverse the loop."
**NOTES** `Now the systems core. Today's response pays out after the flood — relief and loans. In systems terms that's the 'Shifting the Burden' archetype: leaning on the symptomatic quick fix lets real resilience wither, so the problem keeps returning. And it drives a vicious reinforcing loop — a flood causes loss, loss forces debt, debt thins the buffer, so the next flood hits harder, until the shop closes or the family is displaced and the neighbourhood loses its shop. That loop falls first on those least able to absorb it — the uninsured, the informal, women-run micro-businesses like Kak Ros. This is where fairness meets systems. Our move is to shift the intervention upstream and reverse the loop: an early warning drives action, action means less loss, less loss plus telemetry-backed evidence means a faster payout, that builds trust, trust brings more shops, more shops means better data and better playbooks. Same loop, run the other way. That's the leverage point.`

### Slide 10 — Designed for the whole system  (ANCHOR — systems)
**CONTENT** Three columns (accent titles), each with a body and an italic footline:
- `Resilient` — `Feed dies → watchdog advisory. Network dies → earliest tier + paper plan. Three channels: Telegram · SMS · Paper.` — foot: `power, phones, roads — no single point of failure`
- `Fair by design` — `Insurer + council funding subsidises the shops least able to pay. The owner owns their data.` — foot: `a warning you need resources to act on is regressive`
- `Consequences we designed against` — `Redlining → we sell resilience, not risk-scoring for exclusion. Digital divide → SMS + paper. Alert fatigue → tiered debounce + owner in control.` — foot: `a holistic lens anticipates the harm, not just the good`

**LAYOUT** Three equal cards side by side, each with title / body / italic footline.
**NOTES** `And because a flood is a whole system, we designed for the whole system — not just the shop. Resilient: if the data feed dies a watchdog tells every shop to treat heavy rain as a warning; if the network dies the earliest tier already fired and there's a paper plan on the wall — three channels, Telegram, SMS and paper, because the fix needs power, phones and roads too. Fair by design: the insurer-and-council funding subsidises the shops least able to pay, and the owner owns their data — because a warning you need resources to act on is regressive. And we named the unintended consequences and designed against them: insurers could use risk data to redline and drop the most exposed — so we sell resilience and verified claims, not risk-scoring for exclusion, and we keep the data owner-owned; a digital divide — so SMS and paper; alert fatigue and dependency — so tiered alerts with a debounce and the owner always in control. A systems approach means anticipating the harm, not just the good.`

### Slide 11 — It transfers + close
**CONTENT**
- Headline: `Same monsoon. Same last-metre gap. Same fix.`
- Four location pills: `Shah Alam` · `Johor` · `Jakarta` · `Medan / Bukit Lawang`
- Caption: `Same monsoon, same last-metre gap, same fix, same three payers.`
- Close line (large, accent): `“Every flood warning becomes a survival plan — and every survival plan becomes claim evidence.”`
- Sign-off: `BanjirKawan · Terima kasih`

**LAYOUT** A simple row of four location pills (optionally over a faint SEA map shape),
the close line large and centered beneath, sign-off small at the bottom.
**NOTES** `One place. One broken link — the last metre. One intervention, and we've already built it, deployed it, and put a business around it. Every flood warning becomes a shop's personal survival plan, and every survival plan becomes its claim evidence. The rivers are already telling us. BanjirKawan makes sure Kak Ros hears it in time — and gets paid after. Terima kasih.`

---

## ACCURACY LOCK — verify every one of these appears exactly, spelled/formatted as shown

`BanjirKawan` · `Problem 1` · `−RM 40,000` · `December 2021` · `~200 stations` ·
`RM 6.1 billion` · `301` (stations) · `2 real escalations` · `RM 19 / month` ·
`RM 10,600–22,200` · `3h 12m` · `2.0s` · `83%` · `90s` · `4 min` ·
`Anticipate · Absorb · Adapt · Recover` · `Shifting the Burden` ·
`Telegram · SMS · Paper` · `Shah Alam · Johor · Jakarta · Medan / Bukit Lawang` ·
`Climate-U co-creation` · `Terima kasih`.

Use the em dash `—` and the en dash in `RM 10,600–22,200` exactly as written. Do not
change any figure. Do not add slides, remove slides, or reorder them: exactly 11 slides
in the order above.

## OUTPUT
- **Return the finished `BanjirKawan.pptx` file, ready to download and open** — 11
  slides, 16:9, editable text/shapes (not slide images). No code, no commentary.
- Include all 11 slides in the exact order above, with the speaker notes placed in
  each slide's notes field.
- Before returning it, silently self-check against the Accuracy Lock and confirm:
  11 slides, 16:9, every slide (except the title) has a footer, every slide has its
  speaker notes, and every locked number/label appears exactly as written.
- If a tool limit prevents you from attaching a `.pptx`, produce it in the most
  directly usable finished form you can (e.g. a downloadable file) — but never
  substitute a description or code listing for the actual deck.
