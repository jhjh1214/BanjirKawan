// Demo seed: one realistic Klang Valley kedai with a completed flood event so
// every metric is non-zero WITHOUT live data or AI calls. Idempotent — safe to
// re-run (guarded by shop name). Playbooks are constructed deterministically
// and passed through the REAL rules engine: the storm path doesn't care who
// wrote the cache, only that the validator approved it.
//
// Ops script: talks SQL directly where repositories don't support backdated
// timestamps (river readings, check-offs).

import "dotenv/config";
import { Client } from "pg";
import { getConfig } from "../src/lib/config";
import { validatePlaybook } from "../src/modules/playbook/rules-engine";
import type { SiteGraph } from "../src/modules/site-intelligence/schema";
import { siteGraphSchema } from "../src/modules/site-intelligence/schema";

const SHOP_NAME = "Kedai Runcit Sri Muda (Demo)";
const STATION_ID = "3015490"; // Sg. Damansara di TTDI Jaya
const STATION_NAME = "Sg. Damansara di TTDI Jaya";

/* ------------------------------- site graph -------------------------------- */

const graph: SiteGraph = siteGraphSchema.parse({
  shopType: "kedai runcit",
  floorAreaEstimateSqm: 85,
  entrances: [{ id: "e1", facing: "street", widthM: 2.4, stepHeightCm: 8 }],
  assets: [
    { id: "a1", label: "chest freezer (ice cream & frozen goods)", category: "equipment", heightFromFloorCm: 0, movable: false, estValueRM: { low: 3500, high: 6000 }, photoRef: "photo1", confidence: 0.95 },
    { id: "a2", label: "double-door display chiller (drinks)", category: "equipment", heightFromFloorCm: 0, movable: false, estValueRM: { low: 4500, high: 8000 }, photoRef: "photo1", confidence: 0.95 },
    { id: "a3", label: "rice sacks on floor pallets (guni beras)", category: "stock", heightFromFloorCm: 5, movable: true, estMoveMinutes: 15, estValueRM: { low: 1200, high: 2400 }, photoRef: "photo2", confidence: 0.9 },
    { id: "a4", label: "cooking oil & sugar cartons, bottom shelf", category: "stock", heightFromFloorCm: 10, movable: true, estMoveMinutes: 12, estValueRM: { low: 800, high: 1600 }, photoRef: "photo2", confidence: 0.9 },
    { id: "a5", label: "snack & biscuit gondola stock (lower half)", category: "stock", heightFromFloorCm: 20, movable: true, estMoveMinutes: 20, estValueRM: { low: 1500, high: 3000 }, photoRef: "photo3", confidence: 0.85 },
    { id: "a6", label: "cigarette & prepaid card display (counter)", category: "stock", heightFromFloorCm: 90, movable: true, estMoveMinutes: 5, estValueRM: { low: 4000, high: 9000 }, photoRef: "photo4", confidence: 0.9 },
    // NOTE: "electrical" is reserved for power infrastructure (DB box, wiring)
    // — the rules engine forces actions on that category into the final third
    // of a plan. Portable electronics are "equipment".
    { id: "a7", label: "POS terminal + cash drawer", category: "equipment", heightFromFloorCm: 95, movable: true, estMoveMinutes: 3, estValueRM: { low: 1800, high: 3000 }, photoRef: "photo4", confidence: 0.95 },
    { id: "a8", label: "CCTV DVR on floor shelf under counter", category: "equipment", heightFromFloorCm: 25, movable: true, estMoveMinutes: 5, estValueRM: { low: 600, high: 1200 }, photoRef: "photo4", confidence: 0.8 },
    { id: "a9", label: "wooden service counter", category: "furniture", heightFromFloorCm: 0, movable: false, estValueRM: { low: 800, high: 1500 }, photoRef: "photo4", confidence: 0.9 },
    { id: "a10", label: "steel display shelving (4 bays)", category: "furniture", heightFromFloorCm: 0, movable: false, estValueRM: { low: 1600, high: 2800 }, photoRef: "photo3", confidence: 0.9 },
    { id: "a11", label: "business licence & supplier invoices folder", category: "document", heightFromFloorCm: 75, movable: true, estMoveMinutes: 2, estValueRM: { low: 200, high: 1000 }, photoRef: "photo5", confidence: 0.7 },
    { id: "a12", label: "distribution board (DB box) on rear wall", category: "electrical", heightFromFloorCm: 150, movable: false, estValueRM: { low: 700, high: 1500 }, photoRef: "photo5", confidence: 0.9 },
  ],
  electrical: { dbBoxHeightCm: 150, outletsNearFloor: true },
  risks: [
    "Rice sacks and oil cartons stored below 20cm — destroyed by even shallow water.",
    "Freezer and chiller compressors sit at floor level; wiring runs near the skirting.",
    "CCTV DVR at 25cm — evidence system fails first.",
    "Single entrance faces the street camber; water enters over an 8cm step.",
  ],
});

/* --------------------------- deterministic playbooks ------------------------ */
// Built from the graph, validated by the real rules engine before insert.

const PLAYBOOKS: Record<"watch" | "warning" | "danger", Record<"ms" | "en", Array<{ order: number; text: string; targetAssetIds: string[]; estMinutes: number; savesRM: { low: number; high: number }; deadlineOffsetMin: number }>>> = {
  warning: {
    ms: [
      { order: 1, text: "Alihkan rak rokok & kad prabayar serta terminal POS ke tingkat atas (a6, a7).", targetAssetIds: ["a6", "a7"], estMinutes: 8, savesRM: { low: 5800, high: 12000 }, deadlineOffsetMin: 15 },
      { order: 2, text: "Angkat guni beras ke atas kaunter dan rak paling atas (a3).", targetAssetIds: ["a3"], estMinutes: 15, savesRM: { low: 1200, high: 2400 }, deadlineOffsetMin: 35 },
      { order: 3, text: "Pindahkan karton minyak masak & gula ke rak atas (a4).", targetAssetIds: ["a4"], estMinutes: 12, savesRM: { low: 800, high: 1600 }, deadlineOffsetMin: 50 },
      { order: 4, text: "Kosongkan separas bawah gondola snek ke meja & rak atas (a5).", targetAssetIds: ["a5"], estMinutes: 20, savesRM: { low: 1500, high: 3000 }, deadlineOffsetMin: 75 },
      { order: 5, text: "Angkat DVR CCTV dan fail lesen ke atas kaunter (a8, a11).", targetAssetIds: ["a8", "a11"], estMinutes: 6, savesRM: { low: 800, high: 2200 }, deadlineOffsetMin: 85 },
      { order: 6, text: "Cabut palam peti sejuk & penyejuk, kemudian TUTUP suis utama di DB box (a1, a2, a12).", targetAssetIds: ["a1", "a2", "a12"], estMinutes: 8, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 100 },
    ],
    en: [
      { order: 1, text: "Move the cigarette/prepaid display and POS terminal upstairs (a6, a7).", targetAssetIds: ["a6", "a7"], estMinutes: 8, savesRM: { low: 5800, high: 12000 }, deadlineOffsetMin: 15 },
      { order: 2, text: "Lift rice sacks onto the counter and top shelves (a3).", targetAssetIds: ["a3"], estMinutes: 15, savesRM: { low: 1200, high: 2400 }, deadlineOffsetMin: 35 },
      { order: 3, text: "Move cooking-oil and sugar cartons to upper shelves (a4).", targetAssetIds: ["a4"], estMinutes: 12, savesRM: { low: 800, high: 1600 }, deadlineOffsetMin: 50 },
      { order: 4, text: "Clear the lower half of the snack gondola onto tables and top shelves (a5).", targetAssetIds: ["a5"], estMinutes: 20, savesRM: { low: 1500, high: 3000 }, deadlineOffsetMin: 75 },
      { order: 5, text: "Lift the CCTV DVR and the licence/invoice folder onto the counter (a8, a11).", targetAssetIds: ["a8", "a11"], estMinutes: 6, savesRM: { low: 800, high: 2200 }, deadlineOffsetMin: 85 },
      { order: 6, text: "Unplug freezer & chiller, then switch OFF the mains at the DB box (a1, a2, a12).", targetAssetIds: ["a1", "a2", "a12"], estMinutes: 8, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 100 },
    ],
  },
  watch: {
    ms: [
      { order: 1, text: "Sediakan ruang kosong di tingkat atas / rak atas untuk pemindahan stok.", targetAssetIds: [], estMinutes: 20, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 60 },
      { order: 2, text: "Alihkan dokumen penting dan DVR CCTV ke tempat tinggi dahulu (a8, a11).", targetAssetIds: ["a8", "a11"], estMinutes: 6, savesRM: { low: 800, high: 2200 }, deadlineOffsetMin: 90 },
      { order: 3, text: "Angkat guni beras & karton minyak ke atas kaunter (a3, a4).", targetAssetIds: ["a3", "a4"], estMinutes: 25, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 150 },
      { order: 4, text: "Kosongkan separas bawah gondola ke rak atas (a5).", targetAssetIds: ["a5"], estMinutes: 20, savesRM: { low: 1500, high: 3000 }, deadlineOffsetMin: 200 },
      { order: 5, text: "Semak DB box dan pastikan laluan suis utama tidak terhalang (a12).", targetAssetIds: ["a12"], estMinutes: 4, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 220 },
    ],
    en: [
      { order: 1, text: "Prepare empty space upstairs / on top shelves for stock relocation.", targetAssetIds: [], estMinutes: 20, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 60 },
      { order: 2, text: "Move documents and the CCTV DVR to height first (a8, a11).", targetAssetIds: ["a8", "a11"], estMinutes: 6, savesRM: { low: 800, high: 2200 }, deadlineOffsetMin: 90 },
      { order: 3, text: "Lift rice sacks and oil cartons onto the counter (a3, a4).", targetAssetIds: ["a3", "a4"], estMinutes: 25, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 150 },
      { order: 4, text: "Clear the gondola's lower half onto upper shelves (a5).", targetAssetIds: ["a5"], estMinutes: 20, savesRM: { low: 1500, high: 3000 }, deadlineOffsetMin: 200 },
      { order: 5, text: "Check the DB box and keep the mains switch accessible (a12).", targetAssetIds: ["a12"], estMinutes: 4, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 220 },
    ],
  },
  danger: {
    ms: [
      { order: 1, text: "Rebut barang paling bernilai sahaja: rokok, kad prabayar, POS, wang tunai (a6, a7).", targetAssetIds: ["a6", "a7"], estMinutes: 6, savesRM: { low: 5800, high: 12000 }, deadlineOffsetMin: 10 },
      { order: 2, text: "Capai fail lesen & invois, bawa bersama anda (a11).", targetAssetIds: ["a11"], estMinutes: 2, savesRM: { low: 200, high: 1000 }, deadlineOffsetMin: 15 },
      { order: 3, text: "TUTUP suis utama di DB box, cabut palam peti sejuk jika sempat (a12, a1, a2).", targetAssetIds: ["a12", "a1", "a2"], estMinutes: 5, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 25 },
      { order: 4, text: "Kunci kedai dan pergi ke tempat tinggi. Nyawa dahulu, kedai kemudian.", targetAssetIds: [], estMinutes: 5, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 35 },
    ],
    en: [
      { order: 1, text: "Grab only the highest-value items: cigarettes, prepaid cards, POS, cash (a6, a7).", targetAssetIds: ["a6", "a7"], estMinutes: 6, savesRM: { low: 5800, high: 12000 }, deadlineOffsetMin: 10 },
      { order: 2, text: "Take the licence & invoice folder with you (a11).", targetAssetIds: ["a11"], estMinutes: 2, savesRM: { low: 200, high: 1000 }, deadlineOffsetMin: 15 },
      { order: 3, text: "Switch OFF the mains at the DB box; unplug freezer/chiller only if time allows (a12, a1, a2).", targetAssetIds: ["a12", "a1", "a2"], estMinutes: 5, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 25 },
      { order: 4, text: "Lock up and move to high ground. Life first, shop second.", targetAssetIds: [], estMinutes: 5, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 35 },
    ],
  },
};

/* ---------------------------------- seed ----------------------------------- */

async function main() {
  const client = new Client({ connectionString: getConfig().DATABASE_URL });
  await client.connect();

  try {
    const existing = await client.query("select id from shops where name = $1", [SHOP_NAME]);
    if (existing.rows.length > 0) {
      console.log(`seed already present (shop ${existing.rows[0].id}) — nothing to do`);
      return;
    }

    // Validate every playbook against the real rules engine BEFORE touching the DB.
    for (const tier of ["watch", "warning", "danger"] as const) {
      for (const language of ["ms", "en"] as const) {
        const actions = PLAYBOOKS[tier][language];
        const outcome = validatePlaybook(
          { tier, language, estTotalMinutes: actions.reduce((s, a) => s + a.estMinutes, 0), actions },
          graph,
          tier
        );
        if (!outcome.ok) {
          throw new Error(`seed playbook ${tier}/${language} failed rules engine: ${outcome.errors.join("; ")}`);
        }
      }
    }
    console.log("all 6 seed playbooks pass the rules engine");

    await client.query("begin");

    const shop = await client.query<{ id: string }>(
      `insert into shops (name, address, lat, lng, state_code, nearest_station_id, language)
       values ($1, $2, 3.0405, 101.5250, 'SEL', $3, 'ms') returning id`,
      [SHOP_NAME, "Jalan Sri Muda 1, Taman Sri Muda, 40400 Shah Alam, Selangor", STATION_ID]
    );
    const shopId = shop.rows[0].id;

    await client.query(
      `insert into site_graphs (shop_id, version, graph, photo_urls, confirmed)
       values ($1, 1, $2, '{demo/photo1.jpg,demo/photo2.jpg,demo/photo3.jpg,demo/photo4.jpg,demo/photo5.jpg}', true)`,
      [shopId, JSON.stringify(graph)]
    );

    let warningMsPlaybookId = "";
    for (const tier of ["watch", "warning", "danger"] as const) {
      for (const language of ["ms", "en"] as const) {
        const actions = PLAYBOOKS[tier][language];
        const res = await client.query<{ id: string }>(
          `insert into playbooks (shop_id, site_graph_version, tier, language, actions, validated)
           values ($1, 1, $2, $3, $4, true) returning id`,
          [shopId, tier, language, JSON.stringify(actions)]
        );
        if (tier === "warning" && language === "ms") warningMsPlaybookId = res.rows[0].id;
      }
    }

    // A completed WARNING event from ~4h ago with a full station ramp:
    // detection at T0, danger 3h12m after dispatch, receding after peak.
    const T0 = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const sentAt = new Date(T0.getTime() + 2_100);

    const event = await client.query<{ id: string }>(
      `insert into flood_events (station_id, tier, started_at, ended_at, simulated)
       values ($1, 'warning', $2, $3, true) returning id`,
      [STATION_ID, T0, new Date(T0.getTime() + 6 * 60 * 60 * 1000)]
    );
    const eventId = event.rows[0].id;

    // Reading ramp (thresholds: normal 27.5 / alert 29 / warning 30 / danger 31).
    const ramp: Array<[number, number, string]> = [
      [-30, 28.1, "normal"],
      [-15, 28.9, "normal"],
      [0, 30.05, "warning"], // detection moment
      [30, 30.4, "warning"],
      [90, 30.8, "warning"],
      [150, 30.95, "warning"],
      [192, 31.05, "danger"], // first danger: T0 + 3h12m (+2.1s vs sentAt ≈ 3h12m lead)
      [240, 31.4, "danger"], // peak
      [300, 30.6, "warning"],
    ];
    for (const [offsetMin, level, state] of ramp) {
      await client.query(
        `insert into river_readings (station_id, station_name, state_code, level_m, threshold_state, ts)
         values ($1, $2, 'SEL', $3, $4, $5)`,
        [STATION_ID, STATION_NAME, level, state, new Date(T0.getTime() + offsetMin * 60_000 + 2_100)]
      );
    }

    const dispatch = await client.query<{ id: string }>(
      `insert into dispatches (playbook_id, flood_event_id, channel, status, completed_actions, sent_at, updated_at)
       values ($1, $2, 'telegram', 'sent', $3, $4, $4) returning id`,
      [warningMsPlaybookId, eventId, JSON.stringify([1, 2, 3, 5, 6]), sentAt]
    );
    const dispatchId = dispatch.rows[0].id;

    // 5 of 6 actions checked off; first at +90s. (Action 4 — the 20-minute
    // gondola clear — left undone: honest, and shows rmUnactioned.)
    const checkoffOffsetsSec: Array<[number, number]> = [
      [1, 90],
      [2, 480],
      [3, 900],
      [5, 1500],
      [6, 2400],
    ];
    for (const [order, offsetSec] of checkoffOffsetsSec) {
      await client.query(
        `insert into dispatch_checkoffs (dispatch_id, action_order, checked_at)
         values ($1, $2, $3)`,
        [dispatchId, order, new Date(sentAt.getTime() + offsetSec * 1000)]
      );
    }

    await client.query("commit");

    console.log("seeded:");
    console.log(`  shop         ${shopId} (${SHOP_NAME})`);
    console.log(`  site graph   v1, ${graph.assets.length} assets, confirmed`);
    console.log("  playbooks    6 (3 tiers x ms/en), rules-engine validated");
    console.log(`  flood event  ${eventId} (warning @ ${STATION_NAME}, ${T0.toISOString()})`);
    console.log(`  dispatch     ${dispatchId} sent +2.1s, 5/6 checked off, first at +90s`);
    console.log("expected metrics: lead time ~3h 12m · dispatch 2.1s · completion 83%");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
