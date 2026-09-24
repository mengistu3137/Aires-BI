/**
 * ============================================================
 *  AIRES-BI DEVELOPMENT / TESTING DATABASE SEEDER
 * ============================================================
 *
 *  Idempotent and safe to re-run:
 *    - Clears ONLY seed tables in FK-safe order.
 *    - All IDs are valid RFC 4122 UUID v4 format.
 *    - All IDs are deterministic so Postman collections stay valid.
 *
 *  Seeds the full workflow:
 *    Users → Products → Competitors → Stores → SurveyPeriod
 *      → Assignments → AssignmentItems → Audits → QueensPrices
 *      → PriceObservations → PriceAnalyses → Alerts
 *
 *  ⚠️  DEVELOPMENT PASSWORD (all users):
 *        Aires@2026
 *
 *  Run with:  npm run db:seed
 *        or:  npx prisma db seed
 * ============================================================
 */

import "dotenv/config";
import prisma from "../src/config/db.js";

// Resilient bcrypt loader (works with both bcrypt and bcryptjs)
let bcrypt;
try {
  bcrypt = (await import("bcrypt")).default;
} catch {
  bcrypt = (await import("bcryptjs")).default;
}

// ------------------------------------------------------------
// Safe delete — ignores "table does not exist" (P2021)
// and "FK constraint" (P2003) so the seeder doesn't die on
// a fresh DB or a DB where some tables are empty.
// ------------------------------------------------------------
async function safeDelete(label, deleteFn) {
  try {
    await deleteFn();
  } catch (err) {
    if (err.code !== "P2021" && err.code !== "P2003") throw err;
    console.log(`   ⚠️  Skipped ${label}: ${err.code}`);
  }
}

// ---------------------------------------------------------------------
// Preflight: catch schema drift (schema.prisma ahead of applied
// migrations) with a clear, actionable error instead of a raw Prisma
// stack trace mid-seed.
// ---------------------------------------------------------------------
async function ensureSchemaUpToDate() {
  const requiredColumns = [
    { table: "User", column: "locationPermission" },
  ];

  for (const { table, column } of requiredColumns) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      table,
      column
    );
    if (rows.length === 0) {
      throw new Error(
        `\n❌ Schema drift detected: column "${table}.${column}" is missing from the database.\n` +
          `   schema.prisma defines this field, but no migration ever added it in this environment.\n` +
          `   Fix: generate/commit a migration for it (e.g. npx prisma migrate dev --name add_${column}),\n` +
          `   redeploy so "prisma migrate deploy" applies it, then re-run this seeder.\n`
      );
    }
  }
}

// ============================================================
// DETERMINISTIC UUID HELPERS
// ============================================================
// All generated IDs use version 4 and variant 8 (RFC 4122 compliant).
// Format: xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx
// ============================================================

const UID = {
  users: {
    admin: "00000000-0000-4000-8000-000000000001",
    manager: "00000000-0000-4000-8000-000000000002",
    agent1: "00000000-0000-4000-8000-000000000003",
    agent2: "00000000-0000-4000-8000-000000000004",
    agent3: "00000000-0000-4000-8000-000000000005",
    agent4: "00000000-0000-4000-8000-000000000006",
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
  stores: {
    allmartBole: "22222222-0000-4000-8000-000000000001",
    abadirPiassa: "22222222-0000-4000-8000-000000000002",
    shoaBole: "22222222-0000-4000-8000-000000000003",
    bambisKazanchis: "22222222-0000-4000-8000-000000000004",
    freshOldAirport: "22222222-0000-4000-8000-000000000005",
    garmentJomo: "22222222-0000-4000-8000-000000000006",
    straightSaris: "22222222-0000-4000-8000-000000000007",
  },
  period: "33333333-0000-4000-8000-000000000001",
  assignments: {
    agent1: "44444444-0000-4000-8000-000000000001",
    agent2: "44444444-0000-4000-8000-000000000002",
    agent3: "44444444-0000-4000-8000-000000000003",
    agent4: "44444444-0000-4000-8000-000000000004",
  },
  audits: {
    agent1: "55555555-0000-4000-8000-000000000001",
    agent2: "55555555-0000-4000-8000-000000000002",
    agent3: "55555555-0000-4000-8000-000000000003",
    agent4: "55555555-0000-4000-8000-000000000004",
  },
};

// =========================================================================
// REAL QUEEN'S INVESTIGATION CATALOG (100 ULTRA-SENSITIVE + 20 DAILY LOW)
// =========================================================================

const ULTRA_SENSITIVE_ITEMS = [
  { barcode: "6291105766388", name: "MEKELESHA WITH SHENO GHEE 10G", category: "Ultra-Sensitive", unit: "pcs", price: 35.0 },
  { barcode: "6291105764223", name: "MY KISHIN MEKELSHA 2GM", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "1050052", name: "FAMILY IODIZED TABLE SALT 1KG", category: "Ultra-Sensitive", unit: "kg", price: 32.0 },
  { barcode: "1050057", name: "DEGES SALT 1KG(PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 30.0 },
  { barcode: "1050108", name: "FAMILY IODIZED TABLE SALT 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 18.0 },
  { barcode: "6291105764162", name: "MY KISHIN ALCHA SPICE 2.5G", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "1050018", name: "BEBEKA TURMERIC POWDER 250GM", category: "Ultra-Sensitive", unit: "pcs", price: 85.0 },
  { barcode: "1050058", name: "DEGES SALT 500GM(PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 16.0 },
  { barcode: "2519301085459", name: "DEGES SALT 700GM(PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 22.0 },
  { barcode: "2519301085435", name: "DEGES IODIZED TABLE SALT 1KG", category: "Ultra-Sensitive", unit: "kg", price: 30.0 },
  { barcode: "1060003", name: "SUGAR 1KG", category: "Ultra-Sensitive", unit: "kg", price: 110.0 },
  { barcode: "6405090401517", name: "BROWN SUGAR 500G", category: "Ultra-Sensitive", unit: "pcs", price: 140.0 },
  { barcode: "6405090401500", name: "ICING SUGAR 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 130.0 },
  { barcode: "6405090401524", name: "STICK SUGAR 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 150.0 },
  { barcode: "6008155008968", name: "SOSSI SOYA MINCE 10GM", category: "Ultra-Sensitive", unit: "pcs", price: 20.0 },
  { barcode: "6008155016598", name: "SOSSI SOYA CHUNKS 90GM", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "1070036", name: "GUADA MESER KEK", category: "Ultra-Sensitive", unit: "kg", price: 195.0 },
  { barcode: "1070043", name: "GUADA ATER KEK", category: "Ultra-Sensitive", unit: "kg", price: 135.0 },
  { barcode: "1070048", name: "GUADA DEFIN MESER", category: "Ultra-Sensitive", unit: "kg", price: 180.0 },
  { barcode: "1070077", name: "GUADA ATER SHERO 1KG", category: "Ultra-Sensitive", unit: "kg", price: 160.0 },
  { barcode: "1070033", name: "GUADA GEBES KINCHE", category: "Ultra-Sensitive", unit: "kg", price: 95.0 },
  { barcode: "6008155021547", name: "SOSSI SOYA CHUNKS 180GM", category: "Ultra-Sensitive", unit: "pcs", price: 125.0 },
  { barcode: "6008155021677", name: "SOSSI SOYA MINCE 180GM", category: "Ultra-Sensitive", unit: "pcs", price: 125.0 },
  { barcode: "1070032", name: "GUADA AJA KINCHE", category: "Ultra-Sensitive", unit: "kg", price: 105.0 },
  { barcode: "9555246360513", name: "LIBA SUNFLOWER OIL 5L", category: "Ultra-Sensitive", unit: "pcs", price: 890.0 },
  { barcode: "6281102100056", name: "OCHE VEGETABLE GHEE 1KG", category: "Ultra-Sensitive", unit: "pcs", price: 340.0 },
  { barcode: "8697158167079", name: "DANIA REFINED SUNFLOWER OIL 5LITRE", category: "Ultra-Sensitive", unit: "pcs", price: 880.0 },
  { barcode: "8691313988851", name: "OMAR SUN FLOWER OIL 5L", category: "Ultra-Sensitive", unit: "pcs", price: 895.0 },
  { barcode: "8681934019102", name: "SAFYA SUNFLOWER OIL 5LITER", category: "Ultra-Sensitive", unit: "pcs", price: 910.0 },
  { barcode: "8690983039689", name: "OMAAR PURE SUNFLOWER OIL 5 LITER", category: "Ultra-Sensitive", unit: "pcs", price: 900.0 },
  { barcode: "1030000", name: "OCHE VEGETABLE GHEE 5KG", category: "Ultra-Sensitive", unit: "pcs", price: 1550.0 },
  { barcode: "1030004", name: "KOKEB KANA SUNFLOWER OIL 1LI (PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 195.0 },
  { barcode: "8681407016294", name: "ALUU PURE SUNFLOWER OIL 5L", category: "Ultra-Sensitive", unit: "pcs", price: 885.0 },
  { barcode: "6132500710395", name: "CEBON EL MORDJENE GRAISSE PURE VEGETABLE 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 210.0 },
  { barcode: "725765214461", name: "HORIZON COFFEE 1KG", category: "Ultra-Sensitive", unit: "kg", price: 680.0 },
  { barcode: "725765214539", name: "HORIZON COFFEE 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 350.0 },
  { barcode: "725765214546", name: "LIMMU COFFEE 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 360.0 },
  { barcode: "725765214423", name: "BEBEKA COFFEE 1KG", category: "Ultra-Sensitive", unit: "kg", price: 690.0 },
  { barcode: "725765214522", name: "GEMADRO COFFEE 500G", category: "Ultra-Sensitive", unit: "pcs", price: 350.0 },
  { barcode: "725765214454", name: "GEMADRO COFFEE 1KG", category: "Ultra-Sensitive", unit: "kg", price: 680.0 },
  { barcode: "725765214492", name: "BEBEKA COFFEE 500G", category: "Ultra-Sensitive", unit: "pcs", price: 355.0 },
  { barcode: "725765214478", name: "LIMMU COFFEE 1KG", category: "Ultra-Sensitive", unit: "kg", price: 710.0 },
  { barcode: "725765214416", name: "AYEHU COFFEE 1KG", category: "Ultra-Sensitive", unit: "kg", price: 670.0 },
  { barcode: "725765214508", name: "BEHA COFFEE 500G", category: "Ultra-Sensitive", unit: "pcs", price: 345.0 },
  { barcode: "2050002", name: "FARM EGG", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "2050010", name: "LIQUID EGG", category: "Ultra-Sensitive", unit: "pcs", price: 180.0 },
  { barcode: "3020002", name: "ADDIS GOLD LABEL AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 140.0 },
  { barcode: "3020004", name: "WUSH WUSH TEA AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 135.0 },
  { barcode: "725765195463", name: "ADDIS TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 160.0 },
  { barcode: "725765195524", name: "GREEN TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 175.0 },
  { barcode: "3020011", name: "HIBISCUS TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "725765195517", name: "CINNAMON TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "725765195586", name: "AGRICEFT MORINGA TEA", category: "Ultra-Sensitive", unit: "box", price: 190.0 },
  { barcode: "725765195548", name: "GINGER TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 185.0 },
  { barcode: "725765195531", name: "CHOMOMELA TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "725765195555", name: "MINT TEA BAG AGRICEFT", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "61614116", name: "KNORR BEEF CUBE", category: "Ultra-Sensitive", unit: "pcs", price: 25.0 },
  { barcode: "1010010", name: "TOMATO PASTE 70 GM", category: "Ultra-Sensitive", unit: "pcs", price: 45.0 },
  { barcode: "1010004", name: "MERTI TOMATO PASTE 850GM", category: "Ultra-Sensitive", unit: "pcs", price: 260.0 },
  { barcode: "61614123", name: "KNORR CHICKEN", category: "Ultra-Sensitive", unit: "pcs", price: 25.0 },
  { barcode: "2390201379622", name: "SHOLA PASTERIZED COW MILK", category: "Ultra-Sensitive", unit: "pcs", price: 50.0 },
  { barcode: "2020026", name: "SHOLA LAME PLASTIC BOTTLED MILK 1/2 LTR", category: "Ultra-Sensitive", unit: "pcs", price: 55.0 },
  { barcode: "2020025", name: "SHOLA LAME PLASTIC BOTTLED MILK 1 LTR", category: "Ultra-Sensitive", unit: "pcs", price: 105.0 },
  { barcode: "2020036", name: "SHOLA KIDO MILK 150M", category: "Ultra-Sensitive", unit: "pcs", price: 25.0 },
  { barcode: "3010003", name: "DEGA NATURAL WATER 600ML", category: "Ultra-Sensitive", unit: "pcs", price: 22.0 },
  { barcode: "3010014", name: "WATER 30ML(PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 10.0 },
  { barcode: "3010006", name: "DEGA NATURAL WATER 2LIT", category: "Ultra-Sensitive", unit: "pcs", price: 45.0 },
  { barcode: "3010004", name: "DEGA NATURAL WATER 1LIT", category: "Ultra-Sensitive", unit: "pcs", price: 32.0 },
  { barcode: "3010008", name: "CHEERS 10L WATER WITH PLASTIC JAR", category: "Ultra-Sensitive", unit: "pcs", price: 145.0 },
  { barcode: "3010002", name: "CHEERS 20 LITER WATER WITHOUT JAR", category: "Ultra-Sensitive", unit: "pcs", price: 110.0 },
  { barcode: "5010148", name: "MAS BODY SOAP 25GM", category: "Ultra-Sensitive", unit: "pcs", price: 22.0 },
  { barcode: "1301191001401", name: "MAS BODY SOAP 100GM", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "8901842033602", name: "MAS BODY SOAP 75 GM", category: "Ultra-Sensitive", unit: "pcs", price: 50.0 },
  { barcode: "9060012", name: "MAS HAND WASH MANGO 500ML", category: "Ultra-Sensitive", unit: "pcs", price: 165.0 },
  { barcode: "8690506062217", name: "DURU WITH OLIVE OIL 180GM", category: "Ultra-Sensitive", unit: "pcs", price: 130.0 },
  { barcode: "67238891190", name: "DOVE BEAUTY SOAP ORIGINAL 135GM", category: "Ultra-Sensitive", unit: "pcs", price: 240.0 },
  { barcode: "6161115175626", name: "LUX SOAP JASMINE 70G", category: "Ultra-Sensitive", unit: "pcs", price: 75.0 },
  { barcode: "6164004554601", name: "LIFEBUOY SOAP BAR LEMON 12 6*70GM(PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "6164004554595", name: "LIFEBOUY SOAP TOTAL(PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "6164004625714", name: "LIFE BUOY LEMON FRESH 150G", category: "Ultra-Sensitive", unit: "pcs", price: 120.0 },
  { barcode: "5020022", name: "VEGA SOAP 250GM", category: "Ultra-Sensitive", unit: "pcs", price: 55.0 },
  { barcode: "5020024", name: "STAR 2000 SOAP 200GM", category: "Ultra-Sensitive", unit: "pcs", price: 48.0 },
  { barcode: "5010004", name: "STAR LIME VIM 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 95.0 },
  { barcode: "5020003", name: "GOAL DETRGENT POWDER 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 110.0 },
  { barcode: "2512908763478", name: "VITREX SOAP 200GM", category: "Ultra-Sensitive", unit: "pcs", price: 48.0 },
  { barcode: "8542235466739", name: "STAR 2000 SOAP 250GM", category: "Ultra-Sensitive", unit: "pcs", price: 58.0 },
  { barcode: "5020033", name: "GOAL POWDER 30GM", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "8542235466746", name: "VIRTEX SOAP 230GM", category: "Ultra-Sensitive", unit: "pcs", price: 54.0 },
  { barcode: "5010097", name: "GOAL POWDER 200GM", category: "Ultra-Sensitive", unit: "pcs", price: 55.0 },
  { barcode: "36000291452", name: "VEGA POWDER 100 GM", category: "Ultra-Sensitive", unit: "pcs", price: 30.0 },
  { barcode: "2020016", name: "SHOLA LAME YOGHURT 500ML", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "9200387298569", name: "SUPREMA SPAGHETTI 500 G.M", category: "Ultra-Sensitive", unit: "pcs", price: 78.0 },
  { barcode: "6253501820927", name: "OCHE PASTA 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 75.0 },
  { barcode: "6281178494776", name: "OCHE MACARONI 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 75.0 },
  { barcode: "1070066", name: "SUPREMA MACARONI ELBO", category: "Ultra-Sensitive", unit: "pcs", price: 78.0 },
  { barcode: "184375194387", name: "RICCO PASTA(MACARONI) 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 82.0 },
  { barcode: "184375194318", name: "RICCO PASTA STELLINE 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 82.0 },
  { barcode: "8697480065036", name: "SANTA SOPHIA LASAGNA 400GR", category: "Ultra-Sensitive", unit: "pcs", price: 195.0 },
  { barcode: "6224008372202", name: "MILANO VERMICILI MACARONI 500GM", category: "Ultra-Sensitive", unit: "pcs", price: 88.0 },
  { barcode: "6223001513445", name: "ITALINO PREMIUM LASAGNA 400GM (PCS)", category: "Ultra-Sensitive", unit: "pcs", price: 210.0 },
];

const DAILY_LOW_PRICE_ITEMS = [
  // Vegetables
  { barcode: "DLP-VEG-01", name: "RED ONION", category: "Fresh", unit: "kg", price: 64.0 },
  { barcode: "DLP-VEG-02", name: "TOMATO", category: "Fresh", unit: "kg", price: 55.0 },
  { barcode: "DLP-VEG-03", name: "POTATO", category: "Fresh", unit: "kg", price: 48.0 },
  { barcode: "DLP-VEG-04", name: "KELL CABBAGE", category: "Fresh", unit: "kg", price: 35.0 },
  { barcode: "DLP-VEG-05", name: "HOT PEPPERS", category: "Fresh", unit: "kg", price: 120.0 },
  { barcode: "DLP-VEG-06", name: "GARLIC", category: "Fresh", unit: "kg", price: 260.0 },
  { barcode: "DLP-VEG-07", name: "CARROT", category: "Fresh", unit: "kg", price: 42.0 },
  // Fruits
  { barcode: "DLP-FRU-01", name: "ORANGE", category: "Fresh", unit: "kg", price: 130.0 },
  { barcode: "DLP-FRU-02", name: "PAPAYE", category: "Fresh", unit: "kg", price: 85.0 },
  { barcode: "DLP-FRU-03", name: "AVOCADO", category: "Fresh", unit: "kg", price: 95.0 },
  { barcode: "DLP-FRU-04", name: "BANANA", category: "Fresh", unit: "kg", price: 75.0 },
  { barcode: "DLP-FRU-05", name: "LEMMON", category: "Fresh", unit: "kg", price: 90.0 },
  // Dairy
  { barcode: "DLP-DAI-01", name: "LAME MILK 500L", category: "Dairy", unit: "pcs", price: 55.0 },
  { barcode: "DLP-DAI-02", name: "LAME YOGHURT 500ML", category: "Dairy", unit: "pcs", price: 65.0 },
  { barcode: "DLP-DAI-03", name: "LAME CHEESE", category: "Dairy", unit: "kg", price: 240.0 },
  { barcode: "DLP-DAI-04", name: "FARM EGG", category: "Dairy", unit: "crate", price: 420.0 },
  // Meat
  { barcode: "DLP-MEA-01", name: "TOP SIDE MEAT (NEKELE)", category: "Meat", unit: "kg", price: 980.0 },
  { barcode: "DLP-MEA-02", name: "CHUNCK MEAT (YEWET SEGA)", category: "Meat", unit: "kg", price: 850.0 },
  { barcode: "DLP-MEA-03", name: "LAMB CARACASS (YEBEG SEGA)", category: "Meat", unit: "kg", price: 920.0 },
  // Poultry
  { barcode: "DLP-PLT-01", name: "WHOLE CHICKEN", category: "Poultry", unit: "pcs", price: 650.0 },
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("🌱 [Aires-BI] Seeding Queen's Investigation Dataset...\n");

  // ==========================================================
  // 0. PREFLIGHT + CLEAN PREVIOUS DATA — FK-SAFE ORDER
  // ==========================================================
  await ensureSchemaUpToDate();

  console.log("🧹 Clearing previous seed data (FK-safe order)...");
  await safeDelete("Alert", () => prisma.alert.deleteMany());
  await safeDelete("PriceAnalysis", () => prisma.priceAnalysis.deleteMany());
  await safeDelete("PriceObservation", () =>
    prisma.priceObservation.deleteMany(),
  );
  await safeDelete("Audit", () => prisma.audit.deleteMany());
  await safeDelete("AssignmentItem", () => prisma.assignmentItem.deleteMany());
  await safeDelete("SurveyAssignment", () =>
    prisma.surveyAssignment.deleteMany(),
  );
  await safeDelete("QueensPrice", () => prisma.queensPrice.deleteMany());
  await safeDelete("Product", () => prisma.product.deleteMany());
  await safeDelete("Store", () => prisma.store.deleteMany());
  await safeDelete("Competitor", () => prisma.competitor.deleteMany());
  await safeDelete("SurveyPeriod", () => prisma.surveyPeriod.deleteMany());
  await safeDelete("User", () => prisma.user.deleteMany());
  console.log("   ✅ Previous data cleared.\n");

  // ==========================================================
  // 1. USERS
  // ==========================================================
  const passwordHash = await bcrypt.hash("Aires@2026", 10);

  const users = [
    {
      id: UID.users.admin,
      name: "Abraham Shiferaw",
      email: "abraham.admin@aires.et",
      phone: "+251910009094",
      role: "ADMIN",
    },
    {
      id: UID.users.manager,
      name: "Endalkachew Girma",
      email: "endalkachew.manager@aires.et",
      phone: "+251911000002",
      role: "MANAGER",
    },
    {
      id: UID.users.agent1,
      name: "Dawit Haile (Agent 1)",
      email: "agent1@aires.et",
      phone: "+251911223344",
      role: "FIELD_AUDITOR",
    },
    {
      id: UID.users.agent2,
      name: "Marta Girma (Agent 2)",
      email: "agent2@aires.et",
      phone: "+251911223345",
      role: "FIELD_AUDITOR",
    },
    {
      id: UID.users.agent3,
      name: "Yared Tadesse (Agent 3)",
      email: "agent3@aires.et",
      phone: "+251911223346",
      role: "FIELD_AUDITOR",
    },
    {
      id: UID.users.agent4,
      name: "Selam Fikru (Agent 4)",
      email: "agent4@aires.et",
      phone: "+251911223347",
      role: "FIELD_AUDITOR",
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash, active: true } });
  }
  console.log(`✅ Seeded ${users.length} Users`);

  // ==========================================================
  // 2. COMPETITORS
  // ==========================================================
  const competitors = [
    { id: UID.competitors.allmart, name: "Allmart", type: "FMCG" },
    { id: UID.competitors.abadir, name: "Abadir", type: "FMCG" },
    { id: UID.competitors.shoa, name: "Shoa", type: "FMCG" },
    { id: UID.competitors.bambis, name: "Bambis", type: "FMCG" },
    { id: UID.competitors.freshCorner, name: "Fresh Corner", type: "FRESH" },
    {
      id: UID.competitors.garmentMarket,
      name: "Garment Vegetable Market",
      type: "FRESH",
    },
    {
      id: UID.competitors.straightMarket,
      name: "Straight Market",
      type: "FRESH",
    },
  ];

  for (const c of competitors) {
    await prisma.competitor.create({ data: { ...c, active: true } });
  }
  console.log(`✅ Seeded ${competitors.length} Competitors`);

  // ==========================================================
  // 3. STORES
  // ==========================================================
  const stores = [
    {
      id: UID.stores.allmartBole,
      competitorId: UID.competitors.allmart,
      name: "Allmart Supermarket - Bole",
      address: "Bole Medhanialem Road",
      area: "Bole",
      type: "FMCG",
      latitude: 8.998412,
      longitude: 38.78652,
    },
    {
      id: UID.stores.abadirPiassa,
      competitorId: UID.competitors.abadir,
      name: "Abadir Supermarket - Piassa",
      address: "Churchill Ave",
      area: "Piassa",
      type: "FMCG",
      latitude: 9.03045,
      longitude: 38.7521,
    },
    {
      id: UID.stores.shoaBole,
      competitorId: UID.competitors.shoa,
      name: "Shoa Supermarket - Bole Road",
      address: "Africa Avenue",
      area: "Bole",
      type: "FMCG",
      latitude: 9.00124,
      longitude: 38.77123,
    },
    {
      id: UID.stores.bambisKazanchis,
      competitorId: UID.competitors.bambis,
      name: "Bambis Supermarket - Kazanchis",
      address: "Jomo Kenyatta St",
      area: "Kazanchis",
      type: "FMCG",
      latitude: 9.01567,
      longitude: 38.7698,
    },
    {
      id: UID.stores.freshOldAirport,
      competitorId: UID.competitors.freshCorner,
      name: "Fresh Corner - Old Airport",
      address: "South Africa St",
      area: "Old Airport",
      type: "FRESH",
      latitude: 8.9892,
      longitude: 38.7345,
    },
    {
      id: UID.stores.garmentJomo,
      competitorId: UID.competitors.garmentMarket,
      name: "Garment Vegetable Market - Jomo",
      address: "Garment Roundabout",
      area: "Jomo",
      type: "FRESH",
      latitude: 8.9654,
      longitude: 38.7241,
    },
    {
      id: UID.stores.straightSaris,
      competitorId: UID.competitors.straightMarket,
      name: "Straight Market - Saris",
      address: "Debre Zeit Road",
      area: "Saris",
      type: "FRESH",
      latitude: 8.9482,
      longitude: 38.7615,
    },
  ];

  for (const s of stores) {
    await prisma.store.create({
      data: { ...s, city: "Addis Ababa", active: true },
    });
  }
  console.log(`✅ Seeded ${stores.length} Physical Stores`);

  // ==========================================================
  // 4. PRODUCTS + QUEENS PRICES
  // ==========================================================
  // Product IDs are deterministic UUIDs: 40000000-0000-4000-8000-NNNNNNNNNNNN
  //   n = 1..120
  // ==========================================================
  const allProducts = [...ULTRA_SENSITIVE_ITEMS, ...DAILY_LOW_PRICE_ITEMS];
  const createdProducts = [];

  for (const [idx, item] of allProducts.entries()) {
    const id = `40000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`;

    const product = await prisma.product.create({
      data: {
        id,
        name: item.name,
        barcode: item.barcode,
        sku: item.barcode,
        category: item.category,
        unit: item.unit,
        active: true,
      },
    });
    createdProducts.push(product);

    // Initial Queens benchmark price record — one active (open-ended) row per product
    await prisma.queensPrice.create({
      data: {
        productId: product.id,
        price: item.price,
        effectiveFrom: new Date("2026-09-15T00:00:00Z"),
        effectiveTo: null,
        source: "Queen's Official Pricing Strategy",
      },
    });
  }
  console.log(
    `✅ Seeded ${createdProducts.length} Products with Queens Benchmark Prices`,
  );

  // ==========================================================
  // 5. SURVEY PERIOD
  // ==========================================================
  const period = await prisma.surveyPeriod.create({
    data: {
      id: UID.period,
      name: "Queen's Meskerem 15-22 Competitor Survey",
      startDate: new Date("2026-09-25T00:00:00Z"),
      endDate: new Date("2026-10-02T23:59:59Z"),
      status: "OPEN",
    },
  });
  console.log(`✅ Seeded Survey Period: ${period.id}`);

  // ==========================================================
  // 6. ASSIGNMENTS + ASSIGNMENT ITEMS + AUDITS
  // ==========================================================
  const assignmentPlan = [
    {
      key: "agent1",
      auditorId: UID.users.agent1,
      storeId: UID.stores.allmartBole,
      auditStatus: "IN_PROGRESS",
    },
    {
      key: "agent2",
      auditorId: UID.users.agent2,
      storeId: UID.stores.abadirPiassa,
      auditStatus: "IN_PROGRESS",
    },
    {
      key: "agent3",
      auditorId: UID.users.agent3,
      storeId: UID.stores.shoaBole,
      auditStatus: "NOT_STARTED",
    },
    {
      key: "agent4",
      auditorId: UID.users.agent4,
      storeId: UID.stores.bambisKazanchis,
      auditStatus: "NOT_STARTED",
    },
  ];

  const assignments = [];
  const audits = [];

  for (const plan of assignmentPlan) {
    const assignmentId = UID.assignments[plan.key];
    const auditId = UID.audits[plan.key];

    const assignment = await prisma.surveyAssignment.create({
      data: {
        id: assignmentId,
        auditorId: plan.auditorId,
        storeId: plan.storeId,
        surveyPeriodId: period.id,
        status: "IN_PROGRESS",
        startedAt: new Date("2026-09-25T08:00:00Z"),
      },
    });
    assignments.push(assignment);

    // Assign every product to this assignment
    const itemsData = createdProducts.map((p) => ({
      assignmentId,
      productId: p.id,
      required: true,
    }));
    await prisma.assignmentItem.createMany({ data: itemsData });

    // Create matching Audit row for this assignment
    const audit = await prisma.audit.create({
      data: {
        id: auditId,
        assignmentId,
        auditorId: plan.auditorId,
        storeId: plan.storeId,
        surveyPeriodId: period.id,
        status: plan.auditStatus,
        startedAt:
          plan.auditStatus === "NOT_STARTED"
            ? null
            : new Date("2026-09-25T08:05:00Z"),
        startLatitude: plan.auditStatus === "NOT_STARTED" ? null : 8.998412,
        startLongitude: plan.auditStatus === "NOT_STARTED" ? null : 38.78652,
        startAccuracyMeters: plan.auditStatus === "NOT_STARTED" ? null : 5.0,
      },
    });
    audits.push(audit);
  }
  console.log(
    `✅ Seeded ${assignments.length} Assignments, ${createdProducts.length * assignments.length} AssignmentItems, ${audits.length} Audits`,
  );

  // ==========================================================
  // 7. SAMPLE PRICE OBSERVATIONS (so /observations routes work)
  // ==========================================================
  // 12 observations across the 4 audits, covering all availability
  // and sync + review states.
  const obsPlan = [
    // agent1 (IN_PROGRESS audit)
    { auditIdx: 0, productIdx: 0, availability: "AVAILABLE", price: 40.0, syncStatus: "SYNCED", reviewStatus: "PENDING" },
    { auditIdx: 0, productIdx: 2, availability: "AVAILABLE", price: 33.0, syncStatus: "SYNCED", reviewStatus: "APPROVED", reviewer: "manager", note: "Verified." },
    { auditIdx: 0, productIdx: 4, availability: "OUT_OF_STOCK", price: null, syncStatus: "PENDING", reviewStatus: "PENDING" },
    // agent2 (IN_PROGRESS audit)
    { auditIdx: 1, productIdx: 10, availability: "AVAILABLE", price: 115.0, syncStatus: "SYNCED", reviewStatus: "APPROVED", reviewer: "admin", note: "OK" },
    { auditIdx: 1, productIdx: 13, availability: "NOT_FOUND", price: null, syncStatus: "FAILED", reviewStatus: "NEEDS_REVIEW", error: "Network timeout" },
    { auditIdx: 1, productIdx: 20, availability: "AVAILABLE", price: 900.0, syncStatus: "SYNCING", reviewStatus: "PENDING" },
    // agent3 (NOT_STARTED audit — sync-pending offline queue test)
    { auditIdx: 2, productIdx: 30, availability: "AVAILABLE", price: 195.0, syncStatus: "PENDING", reviewStatus: "PENDING" },
    { auditIdx: 2, productIdx: 45, availability: "AVAILABLE", price: 15.0, syncStatus: "SYNCED", reviewStatus: "REJECTED", reviewer: "manager", note: "Price looks like a promo." },
    // agent4 (NOT_STARTED audit)
    { auditIdx: 3, productIdx: 60, availability: "AVAILABLE", price: 25.0, syncStatus: "PENDING", reviewStatus: "PENDING" },
    { auditIdx: 3, productIdx: 75, availability: "OUT_OF_STOCK", price: null, syncStatus: "SYNCED", reviewStatus: "APPROVED", reviewer: "admin", note: "Confirmed." },
    { auditIdx: 3, productIdx: 100, availability: "AVAILABLE", price: 64.0, syncStatus: "SYNCED", reviewStatus: "PENDING" },
    { auditIdx: 3, productIdx: 119, availability: "AVAILABLE", price: 650.0, syncStatus: "FAILED", reviewStatus: "NEEDS_REVIEW", error: "Upload error" },
  ];

  let obsCount = 0;
  for (const [i, o] of obsPlan.entries()) {
    const audit = audits[o.auditIdx];
    const product = createdProducts[o.productIdx];
    const clientId = `seed-obs-${String(i + 1).padStart(5, "0")}`;

    let syncAttempts = 0;
    let syncedAt = null;
    let lastSyncAttemptAt = null;
    let syncError = null;

    if (o.syncStatus === "SYNCED") {
      syncAttempts = 1;
      syncedAt = new Date("2026-09-25T08:30:00Z");
      lastSyncAttemptAt = new Date("2026-09-25T08:30:00Z");
    }
    if (o.syncStatus === "SYNCING") {
      syncAttempts = 1;
      lastSyncAttemptAt = new Date("2026-09-25T08:30:00Z");
    }
    if (o.syncStatus === "FAILED") {
      syncAttempts = 2;
      lastSyncAttemptAt = new Date("2026-09-25T08:30:00Z");
      syncError = o.error || "Network error";
    }

    let reviewedById = null;
    let reviewedAt = null;
    let reviewNote = null;
    if (o.reviewStatus === "APPROVED" || o.reviewStatus === "REJECTED") {
      reviewedById =
        o.reviewer === "admin" ? UID.users.admin : UID.users.manager;
      reviewedAt = new Date("2026-09-25T09:00:00Z");
      reviewNote = o.note || null;
    }

    await prisma.priceObservation.create({
      data: {
        clientObservationId: clientId,
        auditId: audit.id,
        productId: product.id,
        auditorId: audit.auditorId,
        availability: o.availability,
        price: o.price,
        observedUnit: product.unit,
        capturedAt: new Date("2026-09-25T08:10:00Z"),
        syncStatus: o.syncStatus,
        syncAttempts,
        syncedAt,
        lastSyncAttemptAt,
        syncError,
        reviewStatus: o.reviewStatus,
        reviewedById,
        reviewedAt,
        reviewNote,
      },
    });
    obsCount++;
  }
  console.log(`✅ Seeded ${obsCount} Price Observations`);

  // ==========================================================
  // 8. SAMPLE PRICE ANALYSES
  // ==========================================================
  const analysisProductIdx = [0, 2, 4, 10, 13, 20, 30, 45, 60, 100];
  let analysisCount = 0;

  for (const idx of analysisProductIdx) {
    const product = createdProducts[idx];
    const queensRow = await prisma.queensPrice.findFirst({
      where: { productId: product.id, effectiveTo: null },
    });
    if (!queensRow) continue;

    const queensPrice = Number(queensRow.price);
    const competitorAveragePrice = Number((queensPrice * 0.98).toFixed(2));
    const minimumCompetitorPrice = Number((queensPrice * 0.94).toFixed(2));
    const priceIndex = Number(
      ((queensPrice / competitorAveragePrice) * 100).toFixed(2),
    );

    let action = "KEEP";
    if (priceIndex > 102) action = "PRICE_UP";
    else if (priceIndex < 98) action = "PRICE_DOWN";

    await prisma.priceAnalysis.create({
      data: {
        productId: product.id,
        surveyPeriodId: period.id,
        queensPrice,
        minimumCompetitorPrice,
        competitorAveragePrice,
        priceIndex,
        targetIndex: 100.0,
        action,
        notes: "Seeded demo analysis (not computed by the app's formula).",
      },
    });
    analysisCount++;
  }
  console.log(`✅ Seeded ${analysisCount} Price Analyses`);

  // ==========================================================
  // 9. SAMPLE ALERTS
  // ==========================================================
  const alertPlan = [
    { productIdx: 0, type: "PRICE_DOWN", severity: "HIGH", factor: 0.9, resolved: false },
    { productIdx: 10, type: "KEEP", severity: "LOW", factor: 1.01, resolved: true, note: "One-off promo, closed." },
    { productIdx: 20, type: "PRICE_UP", severity: "MEDIUM", factor: 1.06, resolved: false },
    { productIdx: 30, type: "PRICE_DOWN", severity: "CRITICAL", factor: 0.82, resolved: false },
    { productIdx: 45, type: "REVIEW", severity: "MEDIUM", factor: 0.97, resolved: false },
    { productIdx: 60, type: "REVIEW", severity: "CRITICAL", factor: 0.85, resolved: true, note: "Data issue; resolved after recheck." },
  ];

  let alertCount = 0;
  for (const [i, a] of alertPlan.entries()) {
    const product = createdProducts[a.productIdx];
    const queensRow = await prisma.queensPrice.findFirst({
      where: { productId: product.id, effectiveTo: null },
    });
    if (!queensRow) continue;

    const queensPrice = Number(queensRow.price);
    const competitorPrice = Number((queensPrice * a.factor).toFixed(2));
    const priceIndex = Number(
      ((queensPrice / competitorPrice) * 100).toFixed(2),
    );

    await prisma.alert.create({
      data: {
        productId: product.id,
        surveyPeriodId: period.id,
        type: a.type,
        severity: a.severity,
        message: `Seeded alert #${i + 1} for ${product.name}`,
        queensPrice,
        competitorPrice,
        priceIndex,
        resolved: a.resolved,
        resolvedById: a.resolved ? UID.users.manager : null,
        resolvedAt: a.resolved ? new Date("2026-09-25T10:00:00Z") : null,
        resolutionNote: a.note || null,
      },
    });
    alertCount++;
  }
  console.log(`✅ Seeded ${alertCount} Alerts`);

  // ==========================================================
  // SUMMARY
  // ==========================================================
  console.log("\n🎉 [Aires-BI] Database seed complete!\n");
  console.log("════════════════════════════════════════════════════════");
  console.log(" LOGIN CREDENTIALS (dev only) — Password: Aires@2026");
  console.log("════════════════════════════════════════════════════════");
  console.log(` ADMIN       abraham.admin@aires.et`);
  console.log(` MANAGER     endalkachew.manager@aires.et`);
  console.log(` AGENT 1     agent1@aires.et`);
  console.log(` AGENT 2     agent2@aires.et`);
  console.log(` AGENT 3     agent3@aires.et`);
  console.log(` AGENT 4     agent4@aires.et`);
  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log(" DETERMINISTIC IDs FOR POSTMAN");
  console.log("════════════════════════════════════════════════════════");
  console.log(` OPEN SURVEY PERIOD:      ${UID.period}`);
  console.log(` STORE (Allmart Bole):    ${UID.stores.allmartBole}`);
  console.log(` COMPETITOR (Allmart):    ${UID.competitors.allmart}`);
  console.log(` ASSIGNMENT (agent1):     ${UID.assignments.agent1}`);
  console.log(` AUDIT (agent1):          ${UID.audits.agent1}`);
  console.log(` FIRST PRODUCT:           ${createdProducts[0].id}`);
  console.log(` FIRST OBSERVATION:       seed-obs-00001`);
  console.log("════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });