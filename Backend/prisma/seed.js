/**
 * ============================================================
 *  AIRES-BI LOCAL TEST SEEDER
 * ============================================================
 *
 *  Master data (matches Queen_s_Organized_Products.xlsx exactly):
 *    - 20 Daily Fresh items       (frequency DAILY,  sortOrder 1..20)
 *    - 100 Ultra-Sensitive items  (frequency WEEKLY, sortOrder 1..100)
 *    - id = barcode = sku = Item Code, category = workbook "Category (Family)"
 *    - Names pass through formatProductName (same as the importer / reports)
 *
 *  Survey data for testing custom exports (by store / by period):
 *    - 3 periods : 2026-W38 (CLOSED), 2026-W39 (OPEN), 2026-W40 (DRAFT, empty)
 *    - 10 stores : 7 original + 3 extra (multi-store export tests)
 *    - 2 field auditors, assignments, audits, ~1,300 observations per run
 *
 *  Set SEED_DEMO_DATA=false to seed master data only (no survey data).
 *
 *  Afterwards you can import the full workbook from /products: the importer
 *  matches these products by Item Code and fills in the remaining tiers.
 *
 *  Run with: npx prisma db seed
 * ============================================================
 */

import "dotenv/config";
import prisma from "../src/config/db.js";
import { formatProductName } from "../src/modules/report/report.utils.js";

let bcrypt;
try {
  bcrypt = (await import("bcrypt")).default;
} catch {
  bcrypt = (await import("bcryptjs")).default;
}

const SEED_DEMO_DATA = process.env.SEED_DEMO_DATA !== "false";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

// Deterministic PRNG so every seed run produces the same demo data
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260925);

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const uuid = (prefix, n) =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function safeDelete(label, deleteFn) {
  try {
    const result = await deleteFn();
    const count = result?.count ?? 0;
    if (count > 0) {
      console.log(`   ✓ ${label}: ${count} row${count === 1 ? "" : "s"} removed`);
    }
  } catch (err) {
    if (err.code === "P2021") {
      console.log(`   ⚠️  Skipped ${label}: table does not exist (P2021)`);
      return;
    }
    if (err.code === "P2003") {
      console.error(
        `   ❌ Cannot delete ${label}: foreign key constraint (P2003). ` +
        `A dependent row still references it.`,
      );
    }
    throw err;
  }
}

async function ensureSchemaUpToDate() {
  const requiredColumns = [
    { table: "User", column: "locationPermission" },
    { table: "Product", column: "sortOrder" },
    { table: "Product", column: "frequency" },
  ];
  for (const { table, column } of requiredColumns) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      table,
      column,
    );
    if (rows.length === 0) {
      throw new Error(
        `\n❌ Schema drift detected: column "${table}.${column}" is missing from the database.\n` +
        `   Run: npx prisma migrate dev   (or: npx prisma db push)  then: npx prisma generate\n`,
      );
    }
  }
}

async function verifyQueensPrices(productIds) {
  const openEnded = await prisma.queensPrice.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, effectiveTo: null },
    _count: { _all: true },
  });

  const multipleOpen = openEnded.filter((r) => r._count._all > 1);
  if (multipleOpen.length > 0) {
    throw new Error(
      `❌ Verification failed: ${multipleOpen.length} product(s) have multiple open-ended QueensPrice rows.`,
    );
  }

  const missingOpen = productIds.filter(
    (pid) => !openEnded.some((r) => r.productId === pid),
  );
  if (missingOpen.length > 0) {
    throw new Error(
      `❌ Verification failed: ${missingOpen.length} product(s) have no open-ended QueensPrice row.`,
    );
  }

  const total = await prisma.queensPrice.count({
    where: { productId: { in: productIds } },
  });
  if (total !== productIds.length) {
    throw new Error(
      `❌ Verification failed: expected ${productIds.length} QueensPrice rows, found ${total}.`,
    );
  }
}

// ────────────────────────────────────────────────────────────
// Deterministic IDs
// ────────────────────────────────────────────────────────────
const UID = {
  users: {
    admin: "00000000-0000-4000-8000-000000000001",
    manager: "00000000-0000-4000-8000-000000000002",
    auditor1: "00000000-0000-4000-8000-000000000003",
    auditor2: "00000000-0000-4000-8000-000000000004",
  },
  competitors: {
    allmart: "11111111-0000-4000-8000-000000000001",
    abadir: "11111111-0000-4000-8000-000000000002",
    shoa: "11111111-0000-4000-8000-000000000003",
    bambis: "11111111-0000-4000-8000-000000000004",
    freshCorner: "11111111-0000-4000-8000-000000000005",
    garmentMarket: "11111111-0000-4000-8000-000000000006",
    straightMarket: "11111111-0000-4000-8000-000000000007",
  },
};

// ────────────────────────────────────────────────────────────
// Master data (generated from Queen_s_Organized_Products.xlsx)
// ────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    "code": "1",
    "name": "Red Onion",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 1,
    "price": 64.0
  },
  {
    "code": "2",
    "name": "Tomato",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 2,
    "price": 55.0
  },
  {
    "code": "3",
    "name": "Potato",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 3,
    "price": 48.0
  },
  {
    "code": "4",
    "name": "kell Cabbage",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 4,
    "price": 35.0
  },
  {
    "code": "5",
    "name": "Hot Peppers",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 5,
    "price": 120.0
  },
  {
    "code": "6",
    "name": "Garlic",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 6,
    "price": 260.0
  },
  {
    "code": "7",
    "name": "Carrot",
    "category": "Vegetables",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 7,
    "price": 42.0
  },
  {
    "code": "8",
    "name": "Orange",
    "category": "Fruits",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 8,
    "price": 130.0
  },
  {
    "code": "9",
    "name": "Papaye",
    "category": "Fruits",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 9,
    "price": 85.0
  },
  {
    "code": "10",
    "name": "Avocado",
    "category": "Fruits",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 10,
    "price": 95.0
  },
  {
    "code": "11",
    "name": "Banana",
    "category": "Fruits",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 11,
    "price": 75.0
  },
  {
    "code": "12",
    "name": "Lemmon",
    "category": "Fruits",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 12,
    "price": 90.0
  },
  {
    "code": "13",
    "name": "Lame Milk 500ml",
    "category": "Dairy Products",
    "unit": "pcs",
    "frequency": "DAILY",
    "sortOrder": 13,
    "price": 55.0
  },
  {
    "code": "14",
    "name": "Lame Yoghurt 500 ml",
    "category": "Dairy Products",
    "unit": "pcs",
    "frequency": "DAILY",
    "sortOrder": 14,
    "price": 65.0
  },
  {
    "code": "15",
    "name": "Lame Cheese",
    "category": "Dairy Products",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 15,
    "price": 240.0
  },
  {
    "code": "16",
    "name": "Farm Egg",
    "category": "Dairy Products",
    "unit": "crate",
    "frequency": "DAILY",
    "sortOrder": 16,
    "price": 420.0
  },
  {
    "code": "17",
    "name": "Top Side Meat(Nekele)",
    "category": "Meat Products",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 17,
    "price": 980.0
  },
  {
    "code": "18",
    "name": "Chunk Meat(Yewet Sega)",
    "category": "Meat Products",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 18,
    "price": 850.0
  },
  {
    "code": "19",
    "name": "Lamb Caracass (yebeg Sega",
    "category": "Meat Products",
    "unit": "kg",
    "frequency": "DAILY",
    "sortOrder": 19,
    "price": 920.0
  },
  {
    "code": "20",
    "name": "Whole Chicken",
    "category": "Poultry Products",
    "unit": "pcs",
    "frequency": "DAILY",
    "sortOrder": 20,
    "price": 650.0
  },
  {
    "code": "6291105766388",
    "name": "MEKELESHA WITH SHENO GHEE 10G",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 1,
    "price": 35.0
  },
  {
    "code": "6291105764223",
    "name": "MY KISHIN MEKELSHA 2GM",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 2,
    "price": 15.0
  },
  {
    "code": "1050052",
    "name": "FAMILY IODIZED TABLE SALT 1KG",
    "category": "SALT, PEPPER & SPICE",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 3,
    "price": 32.0
  },
  {
    "code": "1050057",
    "name": "DEGES SALT 1KG(PCS)",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 4,
    "price": 30.0
  },
  {
    "code": "1050108",
    "name": "FAMILY IODIZED TABLE SALT 500GM",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 5,
    "price": 18.0
  },
  {
    "code": "6291105764162",
    "name": "MY KISHIN ALCHA SPICE 2.5G",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 6,
    "price": 15.0
  },
  {
    "code": "1050018",
    "name": "bebeka turmeric powder 250gm",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 7,
    "price": 85.0
  },
  {
    "code": "1050058",
    "name": "DEGES SALT 500GM(PCS)",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 8,
    "price": 16.0
  },
  {
    "code": "2519301085459",
    "name": "DEGES SALT 700GM(PCS)",
    "category": "SALT, PEPPER & SPICE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 9,
    "price": 22.0
  },
  {
    "code": "2519301085435",
    "name": "DEGES IODIZED TABLE SALT 1KG",
    "category": "SALT, PEPPER & SPICE",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 10,
    "price": 30.0
  },
  {
    "code": "1060003",
    "name": "SUGAR 1KG",
    "category": "SUGAR",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 11,
    "price": 110.0
  },
  {
    "code": "6405090401517",
    "name": "BROWN SUGAR 500G",
    "category": "SUGAR",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 12,
    "price": 140.0
  },
  {
    "code": "6405090401500",
    "name": "ICING SUGAR 500GM",
    "category": "SUGAR",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 13,
    "price": 130.0
  },
  {
    "code": "6405090401524",
    "name": "STICK SUGAR 500GM",
    "category": "SUGAR",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 14,
    "price": 150.0
  },
  {
    "code": "6008155008968",
    "name": "SOSSI SOYA MINCE 10GM",
    "category": "PULSES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 15,
    "price": 20.0
  },
  {
    "code": "6008155016598",
    "name": "SOSSI SOYA CHUNKS 90GM",
    "category": "PULSES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 16,
    "price": 65.0
  },
  {
    "code": "1070036",
    "name": "GUADA MESER KEK",
    "category": "PULSES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 17,
    "price": 195.0
  },
  {
    "code": "1070043",
    "name": "GUADA ATER KEK",
    "category": "PULSES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 18,
    "price": 135.0
  },
  {
    "code": "1070048",
    "name": "GUADA DEFIN MESER",
    "category": "PULSES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 19,
    "price": 180.0
  },
  {
    "code": "1070077",
    "name": "GUADA ATER SHERO 1KG",
    "category": "PULSES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 20,
    "price": 160.0
  },
  {
    "code": "1070033",
    "name": "GUADA GEBES KINCHE",
    "category": "PULSES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 21,
    "price": 95.0
  },
  {
    "code": "6008155021547",
    "name": "SOSSI SOYA CHUNKS 180GM",
    "category": "PULSES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 22,
    "price": 125.0
  },
  {
    "code": "6008155021677",
    "name": "SOSSI SOYA MINCE 180GM",
    "category": "PULSES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 23,
    "price": 125.0
  },
  {
    "code": "1070032",
    "name": "GUADA AJA KINCHE",
    "category": "PULSES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 24,
    "price": 105.0
  },
  {
    "code": "9555246360513",
    "name": "LIBA SUNFLOWER OIL 5L",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 25,
    "price": 890.0
  },
  {
    "code": "6281102100056",
    "name": "OCHE VEGETABLE GHEE 1KG",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 26,
    "price": 340.0
  },
  {
    "code": "8697158167079",
    "name": "DANIA REFINED SUNFLOWER OIL 5LITRE",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 27,
    "price": 880.0
  },
  {
    "code": "8691313988851",
    "name": "OMAR SUN FLOWER OIL 5L",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 28,
    "price": 895.0
  },
  {
    "code": "8681934019102",
    "name": "SAFYA SUNFLOWER OIL 5LITER",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 29,
    "price": 910.0
  },
  {
    "code": "8690983039689",
    "name": "OMAAR PURE SUNFLOWER OIL  5 LITER",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 30,
    "price": 900.0
  },
  {
    "code": "1030000",
    "name": "OCHE VEGETABLE GHEE5KG",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 31,
    "price": 1550.0
  },
  {
    "code": "1030004",
    "name": "KOKEB KANA SUNFLOWER OIL 1LI (PCS)",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 32,
    "price": 195.0
  },
  {
    "code": "8681407016294",
    "name": "ALUU PURE SUNFLOWER OIL 5L",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 33,
    "price": 885.0
  },
  {
    "code": "6132500710395",
    "name": "CEBON EL MORDJENE GRAISSE PURE VEGETABLE 500GM",
    "category": "COOKING OIL & GHEE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 34,
    "price": 210.0
  },
  {
    "code": "725765214461",
    "name": "HORIZON COFFEE 1KG",
    "category": "ROASTED COFFEES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 35,
    "price": 680.0
  },
  {
    "code": "725765214539",
    "name": "HORIZON COFFEE 500GM",
    "category": "ROASTED COFFEES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 36,
    "price": 350.0
  },
  {
    "code": "725765214546",
    "name": "LIMMU COFFEE 500GM",
    "category": "ROASTED COFFEES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 37,
    "price": 360.0
  },
  {
    "code": "725765214423",
    "name": "BEBEKA COFFEE 1KG",
    "category": "ROASTED COFFEES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 38,
    "price": 690.0
  },
  {
    "code": "725765214522",
    "name": "GEMADRO COFFEE 500G(",
    "category": "ROASTED COFFEES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 39,
    "price": 350.0
  },
  {
    "code": "725765214454",
    "name": "GEMADRO COFFEE 1KG",
    "category": "ROASTED COFFEES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 40,
    "price": 680.0
  },
  {
    "code": "725765214492",
    "name": "BEBEKA COFFEE 500G",
    "category": "ROASTED COFFEES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 41,
    "price": 355.0
  },
  {
    "code": "725765214478",
    "name": "LIMMU COFFEE 1KG",
    "category": "ROASTED COFFEES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 42,
    "price": 710.0
  },
  {
    "code": "725765214416",
    "name": "AYEHU COFFEE 1KG",
    "category": "ROASTED COFFEES",
    "unit": "kg",
    "frequency": "WEEKLY",
    "sortOrder": 43,
    "price": 670.0
  },
  {
    "code": "725765214508",
    "name": "BEHA COFFEE 500G",
    "category": "ROASTED COFFEES",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 44,
    "price": 345.0
  },
  {
    "code": "2050002",
    "name": "FARM EGG",
    "category": "EGGS",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 45,
    "price": 15.0
  },
  {
    "code": "2050010",
    "name": "LIQUID EGG",
    "category": "EGGS",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 46,
    "price": 180.0
  },
  {
    "code": "3020002",
    "name": "ADDIS GOLD LABEL AGRICEFT",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 47,
    "price": 140.0
  },
  {
    "code": "3020004",
    "name": "wush wush tea agriceft",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 48,
    "price": 135.0
  },
  {
    "code": "725765195463",
    "name": "ADDIS TEA BAG AGRICEFT",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 49,
    "price": 160.0
  },
  {
    "code": "725765195524",
    "name": "GREEN TEA BAG AGRICEFT",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 50,
    "price": 175.0
  },
  {
    "code": "3020011",
    "name": "HIBISCUS TEA BAG AGRICEFT",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 51,
    "price": 180.0
  },
  {
    "code": "725765195517",
    "name": "CINNAMON TEA BAG AGRICEFT",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 52,
    "price": 180.0
  },
  {
    "code": "725765195586",
    "name": "agriceft moringa tea",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 53,
    "price": 190.0
  },
  {
    "code": "725765195548",
    "name": "ginger tea bag agriceft",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 54,
    "price": 185.0
  },
  {
    "code": "725765195531",
    "name": "CHOMOMELA TEA BAG AGRICEFT",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 55,
    "price": 180.0
  },
  {
    "code": "725765195555",
    "name": "mint tea bag agriceft",
    "category": "TEAS & HERBAL TEAS",
    "unit": "box",
    "frequency": "WEEKLY",
    "sortOrder": 56,
    "price": 180.0
  },
  {
    "code": "61614116",
    "name": "Knorr",
    "category": "COOKING",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 57,
    "price": 25.0
  },
  {
    "code": "1010010",
    "name": "tomato paste 70 gm",
    "category": "COOKING",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 58,
    "price": 45.0
  },
  {
    "code": "1010004",
    "name": "MERTI TOMATO PASTE  850GM",
    "category": "COOKING",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 59,
    "price": 260.0
  },
  {
    "code": "61614123",
    "name": "Knorr Chicken",
    "category": "COOKING",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 60,
    "price": 25.0
  },
  {
    "code": "2390201379622",
    "name": "SHOLA PASTERIZED COW  MILK",
    "category": "FRESH MILK",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 61,
    "price": 50.0
  },
  {
    "code": "2020026",
    "name": "SHOLA LAME PLASTIC BOTTLED MILK 1/2 LTR",
    "category": "FRESH MILK",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 62,
    "price": 55.0
  },
  {
    "code": "2020025",
    "name": "SHOLA LAME PLASTIC BOTTLED MILK 1 LTR",
    "category": "FRESH MILK",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 63,
    "price": 105.0
  },
  {
    "code": "2020036",
    "name": "SHOLA KIDO  MILK 150M",
    "category": "FRESH MILK",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 64,
    "price": 25.0
  },
  {
    "code": "3010003",
    "name": "DEGA NATURAL WATER 600ML",
    "category": "WATER",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 65,
    "price": 22.0
  },
  {
    "code": "3010014",
    "name": "WATER 30ML(PCS)",
    "category": "WATER",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 66,
    "price": 10.0
  },
  {
    "code": "3010006",
    "name": "DEGA NATURAL WATER 2LIT",
    "category": "WATER",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 67,
    "price": 45.0
  },
  {
    "code": "3010004",
    "name": "DEGA NATURAL WATER 1LIT",
    "category": "WATER",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 68,
    "price": 32.0
  },
  {
    "code": "3010008",
    "name": "CHEERS  10L WATER WITH PLASTIC JAR",
    "category": "WATER",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 69,
    "price": 145.0
  },
  {
    "code": "3010002",
    "name": "CHEERS 20 LITER WATER WITHOUT JAR",
    "category": "WATER",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 70,
    "price": 110.0
  },
  {
    "code": "5010148",
    "name": "MAS BODY SOAP 25GM",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 71,
    "price": 22.0
  },
  {
    "code": "1301191001401",
    "name": "MAS BODY SOAP 100GM",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 72,
    "price": 65.0
  },
  {
    "code": "8901842033602",
    "name": "MAS BODY SOAP 75 GM",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 73,
    "price": 50.0
  },
  {
    "code": "9060012",
    "name": "MAS HAND WASH MANGO 500ML",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 74,
    "price": 165.0
  },
  {
    "code": "8690506062217",
    "name": "DURU WITH OLIVE OIL 180GM",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 75,
    "price": 130.0
  },
  {
    "code": "67238891190",
    "name": "DOVE BEAUTY  SOAP ORIGINAL 135GM",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 76,
    "price": 240.0
  },
  {
    "code": "6161115175626",
    "name": "LUX SOAP JASMINE 70G",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 77,
    "price": 75.0
  },
  {
    "code": "6164004554601",
    "name": "LIFEBUOY SOAP BAR LEMON 12*6*70GM(PCS)",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 78,
    "price": 65.0
  },
  {
    "code": "6164004554595",
    "name": "LIFEBOUY SOAP TOTAL(PCS)",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 79,
    "price": 65.0
  },
  {
    "code": "6164004625714",
    "name": "LIFE BUOY LEMON FRESH 150G",
    "category": "PERSONAL HYGIENE UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 80,
    "price": 120.0
  },
  {
    "code": "5020022",
    "name": "VEGA SOAP  250GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 81,
    "price": 55.0
  },
  {
    "code": "5020024",
    "name": "STAR 2000 SOAP  200GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 82,
    "price": 48.0
  },
  {
    "code": "5010004",
    "name": "STAR LIME VIM 500GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 83,
    "price": 95.0
  },
  {
    "code": "5020003",
    "name": "GOAL DETRGENT POWDER 500GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 84,
    "price": 110.0
  },
  {
    "code": "2512908763478",
    "name": "VITREX  SOAP 200GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 85,
    "price": 48.0
  },
  {
    "code": "8542235466739",
    "name": "STAR 2000 SOAP  250GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 86,
    "price": 58.0
  },
  {
    "code": "5020033",
    "name": "GOAL POWDER 30GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 87,
    "price": 15.0
  },
  {
    "code": "8542235466746",
    "name": "VIRTEX SOAP 230GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 88,
    "price": 54.0
  },
  {
    "code": "5010097",
    "name": "GOAL POWDER  200GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 89,
    "price": 55.0
  },
  {
    "code": "36000291452",
    "name": "VEGA POWDER 100 GM",
    "category": "WASHING UNIVERSE",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 90,
    "price": 30.0
  },
  {
    "code": "2020016",
    "name": "SHOLA LAME YOGHURT 500ML",
    "category": "YOGURTS",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 91,
    "price": 65.0
  },
  {
    "code": "9200387298569",
    "name": "SUPREMA  SPAGHETTI 500 G.M",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 92,
    "price": 78.0
  },
  {
    "code": "6253501820927",
    "name": "OCHE PASTA 500GM",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 93,
    "price": 75.0
  },
  {
    "code": "6281178494776",
    "name": "OCHE MACARONI 500GM",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 94,
    "price": 75.0
  },
  {
    "code": "1070066",
    "name": "SUPREMA MACARONI ELBO",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 95,
    "price": 78.0
  },
  {
    "code": "184375194387",
    "name": "RICCO  PASTA(MACARONI) 500GM",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 96,
    "price": 82.0
  },
  {
    "code": "184375194318",
    "name": "RICCO PASTA STELLINE 500GM",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 97,
    "price": 82.0
  },
  {
    "code": "8697480065036",
    "name": "SANTA SOPHIA LASAGNA 400GR",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 98,
    "price": 195.0
  },
  {
    "code": "6224008372202",
    "name": "MILANO VERMICILI MACARONI 500GM",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 99,
    "price": 88.0
  },
  {
    "code": "6223001513445",
    "name": "ITALINO PREMIUM LASAGNA 400GM (PCS)",
    "category": "PASTA",
    "unit": "pcs",
    "frequency": "WEEKLY",
    "sortOrder": 100,
    "price": 210.0
  }
];

const STORES = [
  { id: "22222222-0000-4000-8000-000000000001", competitorId: UID.competitors.allmart, name: "Allmart Supermarket - Bole", address: "Bole Medhanialem Road", area: "Bole", type: "FMCG", latitude: 8.998412, longitude: 38.78652 },
  { id: "22222222-0000-4000-8000-000000000002", competitorId: UID.competitors.abadir, name: "Abadir Supermarket - Piassa", address: "Churchill Ave", area: "Piassa", type: "FMCG", latitude: 9.03045, longitude: 38.7521 },
  { id: "22222222-0000-4000-8000-000000000003", competitorId: UID.competitors.shoa, name: "Shoa Supermarket - Bole Road", address: "Africa Avenue", area: "Bole", type: "FMCG", latitude: 9.00124, longitude: 38.77123 },
  { id: "22222222-0000-4000-8000-000000000004", competitorId: UID.competitors.bambis, name: "Bambis Supermarket - Kazanchis", address: "Jomo Kenyatta St", area: "Kazanchis", type: "FMCG", latitude: 9.01567, longitude: 38.7698 },
  { id: "22222222-0000-4000-8000-000000000005", competitorId: UID.competitors.freshCorner, name: "Fresh Corner - Old Airport", address: "South Africa St", area: "Old Airport", type: "FRESH", latitude: 8.9892, longitude: 38.7345 },
  { id: "22222222-0000-4000-8000-000000000006", competitorId: UID.competitors.garmentMarket, name: "Garment Vegetable Market - Jomo", address: "Garment Roundabout", area: "Jomo", type: "FRESH", latitude: 8.9654, longitude: 38.7241 },
  { id: "22222222-0000-4000-8000-000000000007", competitorId: UID.competitors.straightMarket, name: "Straight Market - Saris", address: "Debre Zeit Road", area: "Saris", type: "FRESH", latitude: 8.9482, longitude: 38.7615 },
  // Extra stores for multi-store export tests
  { id: "22222222-0000-4000-8000-000000000008", competitorId: UID.competitors.allmart, name: "Allmart Supermarket - CMC", address: "CMC Road", area: "CMC", type: "FMCG", latitude: 9.0150, longitude: 38.8250 },
  { id: "22222222-0000-4000-8000-000000000009", competitorId: UID.competitors.shoa, name: "Shoa Supermarket - Megenagna", address: "Megenagna Square", area: "Megenagna", type: "FMCG", latitude: 9.0200, longitude: 38.7900 },
  { id: "22222222-0000-4000-8000-000000000010", competitorId: UID.competitors.freshCorner, name: "Fresh Corner - Bole", address: "Bole Road", area: "Bole", type: "FRESH", latitude: 8.9990, longitude: 38.7800 },
];

const PERIODS = [
  { id: "2026-W38", name: "Week 38 Retail Survey Cycle 2026", startDate: new Date("2026-09-18T00:00:00Z"), endDate: new Date("2026-09-24T23:59:59Z"), status: "CLOSED" },
  { id: "2026-W39", name: "Week 39 Retail Survey Cycle 2026", startDate: new Date("2026-09-25T00:00:00Z"), endDate: new Date("2026-10-02T23:59:59Z"), status: "OPEN" },
  { id: "2026-W40", name: "Week 40 Retail Survey Cycle 2026", startDate: new Date("2026-10-03T00:00:00Z"), endDate: new Date("2026-10-09T23:59:59Z"), status: "DRAFT" },
];


// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 [Aires-BI] Local test seeder starting...\n");

  await ensureSchemaUpToDate();

  // ── CLEAR (child → parent) ────────────────────────────────
  console.log("🧹 Clearing previous data (child → parent)...");
  await safeDelete("Alert", () => prisma.alert.deleteMany({}));
  await safeDelete("PriceAnalysis", () => prisma.priceAnalysis.deleteMany({}));
  await safeDelete("PriceObservation", () => prisma.priceObservation.deleteMany({}));
  await safeDelete("Audit", () => prisma.audit.deleteMany({}));
  await safeDelete("AssignmentItem", () => prisma.assignmentItem.deleteMany({}));
  await safeDelete("SurveyAssignment", () => prisma.surveyAssignment.deleteMany({}));
  await safeDelete("QueensPrice", () => prisma.queensPrice.deleteMany({}));
  await safeDelete("Product", () => prisma.product.deleteMany({}));
  await safeDelete("Store", () => prisma.store.deleteMany({}));
  await safeDelete("Competitor", () => prisma.competitor.deleteMany({}));
  await safeDelete("SurveyPeriod", () => prisma.surveyPeriod.deleteMany({}));
  await safeDelete("User", () => prisma.user.deleteMany({}));
  console.log("   ✅ Clean slate established.\n");

  // ── 1. Users ──────────────────────────────────────────────
  const password = process.env.SEED_DEFAULT_PASSWORD || "Aires@2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const users = [
    { id: UID.users.admin, name: "Abraham Shiferaw", email: "abraham.admin@aires.et", phone: "+251910009094", role: "ADMIN" },
    { id: UID.users.manager, name: "Endalkachew Girma", email: "endalkachew.manager@aires.et", phone: "+251911000002", role: "MANAGER" },
  ];
  if (SEED_DEMO_DATA) {
    users.push(
      { id: UID.users.auditor1, name: "Selam Tesfaye", email: "selam.auditor@aires.et", phone: "+251911000003", role: "FIELD_AUDITOR" },
      { id: UID.users.auditor2, name: "Dawit Bekele", email: "dawit.auditor@aires.et", phone: "+251911000004", role: "FIELD_AUDITOR" },
    );
  }
  await prisma.user.createMany({
    data: users.map((u) => ({ ...u, passwordHash, active: true })),
  });
  console.log(`✅ Seeded ${users.length} Users`);

  // ── 2. Competitors ────────────────────────────────────────
  const competitors = [
    { id: UID.competitors.allmart, name: "Allmart", type: "FMCG" },
    { id: UID.competitors.abadir, name: "Abadir", type: "FMCG" },
    { id: UID.competitors.shoa, name: "Shoa", type: "FMCG" },
    { id: UID.competitors.bambis, name: "Bambis", type: "FMCG" },
    { id: UID.competitors.freshCorner, name: "Fresh Corner", type: "FRESH" },
    { id: UID.competitors.garmentMarket, name: "Garment Vegetable Market", type: "FRESH" },
    { id: UID.competitors.straightMarket, name: "Straight Market", type: "FRESH" },
  ];
  await prisma.competitor.createMany({
    data: competitors.map((c) => ({ ...c, active: true })),
  });
  console.log(`✅ Seeded ${competitors.length} Competitors`);

  // ── 3. Stores ─────────────────────────────────────────────
  await prisma.store.createMany({
    data: STORES.map((s) => ({ ...s, city: "Addis Ababa", active: true })),
  });
  console.log(`✅ Seeded ${STORES.length} Stores`);

  // ── 4. Products + Queens benchmark prices ─────────────────
  const productRows = PRODUCTS.map((p) => ({
    id: p.code,
    name: formatProductName(p.name),
    barcode: p.code,
    sku: p.code,
    category: p.category,
    unit: p.unit,
    frequency: p.frequency,
    sortOrder: p.sortOrder,
    active: true,
  }));
  await prisma.product.createMany({ data: productRows });
  console.log(
    `✅ Seeded ${productRows.length} Products (20 DAILY + 100 WEEKLY, SortedBy applied)`,
  );

  const BENCHMARK_FROM = new Date("2026-09-01T00:00:00Z");
  await prisma.queensPrice.createMany({
    data: PRODUCTS.map((p) => ({
      productId: p.code,
      price: p.price,
      effectiveFrom: BENCHMARK_FROM,
      effectiveTo: null,
      source: "Queen's Official Pricing Strategy",
    })),
  });
  console.log(`✅ Seeded ${PRODUCTS.length} benchmark prices`);

  // ── 5. Survey periods ─────────────────────────────────────
  await prisma.surveyPeriod.createMany({ data: PERIODS });
  console.log(`✅ Seeded ${PERIODS.length} Survey Periods`);

  await verifyQueensPrices(PRODUCTS.map((p) => p.code));
  console.log("🔒 Verified: every product has exactly 1 open-ended benchmark");

  // ── 6. Demo survey data ───────────────────────────────────
  if (!SEED_DEMO_DATA) {
    console.log("\n🛡️  SEED_DEMO_DATA=false → no assignments / audits / observations.");
  } else {
    const fmcgProducts = PRODUCTS.filter((p) => p.frequency === "WEEKLY");
    const freshProducts = PRODUCTS.filter((p) => p.frequency === "DAILY");

    const assignments = [];
    const items = [];
    const audits = [];
    const observations = [];

    let aIdx = 0;
    for (const period of PERIODS.filter((p) => p.status !== "DRAFT")) {
      const startMs = new Date(period.startDate).getTime();
      const spanDays = Math.max(
        1,
        Math.round((new Date(period.endDate).getTime() - startMs) / 86400000),
      );

      STORES.forEach((store, sIdx) => {
        aIdx += 1;
        const auditorId = sIdx % 2 === 0 ? UID.users.auditor1 : UID.users.auditor2;
        const assignmentId = uuid("50000000", aIdx);
        const auditId = uuid("60000000", aIdx);
        const storeProducts = store.type === "FRESH" ? freshProducts : fmcgProducts;

        const visitDay = Math.floor(rnd() * spanDays);
        const visitStart = new Date(startMs + visitDay * 86400000 + 8 * 3600000);
        const visitEnd = new Date(visitStart.getTime() + 150 * 60000);

        assignments.push({
          id: assignmentId,
          auditorId,
          storeId: store.id,
          surveyPeriodId: period.id,
          status: "COMPLETED",
          assignedAt: new Date(startMs),
          startedAt: visitStart,
          completedAt: visitEnd,
        });

        audits.push({
          id: auditId,
          assignmentId,
          auditorId,
          storeId: store.id,
          surveyPeriodId: period.id,
          status: "COMPLETED",
          startedAt: visitStart,
          completedAt: visitEnd,
          startLatitude: store.latitude,
          startLongitude: store.longitude,
          endLatitude: store.latitude,
          endLongitude: store.longitude,
          startAccuracyMeters: 8.5,
          endAccuracyMeters: 9.2,
          distanceFromStoreMeters: Math.round(rnd() * 40 * 100) / 100,
          gpsValid: true,
          notes: "Seeded demo audit",
        });

        storeProducts.forEach((prod, pIdx) => {
          items.push({ assignmentId, productId: prod.code, required: true });

          const roll = rnd();
          const availability =
            roll < 0.85 ? "AVAILABLE" : roll < 0.93 ? "OUT_OF_STOCK" : "NOT_FOUND";

          const price =
            availability === "AVAILABLE"
              ? Math.round(prod.price * (0.88 + rnd() * 0.3) * 100) / 100
              : null;

          const review =
            rnd() < 0.7 ? "APPROVED" : rnd() < 0.85 ? "PENDING" : "NEEDS_REVIEW";

          const capturedAt = new Date(
            visitStart.getTime() + Math.floor((pIdx / storeProducts.length) * 140) * 60000,
          );

          observations.push({
            clientObservationId: `seed-${aIdx}-${prod.code}`,
            auditId,
            productId: prod.code,
            auditorId,
            availability,
            price,
            substituteProduct:
              availability === "OUT_OF_STOCK" && rnd() < 0.4
                ? "Similar Brand (Substitute)"
                : null,
            observedUnit: prod.unit,
            capturedAt,
            syncStatus: "SYNCED",
            syncedAt: capturedAt,
            reviewStatus: review,
          });
        });
      });
    }

    await prisma.surveyAssignment.createMany({ data: assignments });
    await prisma.audit.createMany({ data: audits });
    for (const part of chunk(items, 1000)) {
      await prisma.assignmentItem.createMany({ data: part });
    }
    for (const part of chunk(observations, 500)) {
      await prisma.priceObservation.createMany({ data: part });
    }

    console.log(
      `✅ Seeded demo survey data: ${assignments.length} assignments, ${audits.length} audits, ` +
      `${items.length} assignment items, ${observations.length} observations`,
    );
  }

  // ── Summary ───────────────────────────────────────────────
  console.log("\n🎉 [Aires-BI] Seeding complete!\n");
  console.log("════════════════════════════════════════════════════════");
  console.log(` Password (all users): ${password}`);
  console.log("════════════════════════════════════════════════════════");
  console.log(" ADMIN     abraham.admin@aires.et");
  console.log(" MANAGER   endalkachew.manager@aires.et");
  if (SEED_DEMO_DATA) {
    console.log(" AUDITOR   selam.auditor@aires.et / dawit.auditor@aires.et");
  }
  console.log("════════════════════════════════════════════════════════");
  console.log(" Export tests: pick a period (W38 / W39) and/or one or more stores.");
  console.log(" W40 is DRAFT with no data → should return a 404 'no observations'.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });