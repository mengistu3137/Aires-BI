/**
 * ============================================================
 *  AIRES-BI ENTERPRISE PRODUCTION INITIALIZER
 * ============================================================
 *
 *  Locks in authoritative master data ONLY:
 *    Users → Competitors → Stores → 120 Products + Benchmark Prices
 *      → Survey Period → Assignments → AssignmentItems → Audits
 *
 *  - Product Names: Capitalized each word (Title Case)
 *  - Audits: NOT_STARTED with null GPS coordinates and timestamps
 *  - Observations/Analyses/Alerts: 0 rows (generated exclusively by live audits)
 *
 *  Run with: npm run db:seed
 *        or: npx prisma db seed
 * ============================================================
 */

import "dotenv/config";
import prisma from "../src/config/db.js";

// Resilient bcrypt loader
let bcrypt;
try {
  bcrypt = (await import("bcrypt")).default;
} catch {
  bcrypt = (await import("bcryptjs")).default;
}

// Helper: Capitalize each word (Title Case) with clean packaging suffixes
function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.startsWith("(") && word.endsWith(")")) {
        return `(${word.charAt(1).toUpperCase()}${word.slice(2)}`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\b(\d+)\s*gm\b/gi, "$1g")
    .replace(/\b(\d+)\s*g\b/gi, "$1g")
    .replace(/\b(\d+)\s*kg\b/gi, "$1kg")
    .replace(/\b(\d+)\s*l\b/gi, "$1L")
    .replace(/\b(\d+)\s*ltr\b/gi, "$1L")
    .replace(/\b(\d+)\s*litre\b/gi, "$1L")
    .replace(/\b(\d+)\s*liter\b/gi, "$1L")
    .replace(/\b(\d+)\s*ml\b/gi, "$1ml");
}

// Safe delete helper
async function safeDelete(label, deleteFn) {
  try {
    await deleteFn();
  } catch (err) {
    if (err.code !== "P2021" && err.code !== "P2003") throw err;
    console.log(`   ⚠️  Skipped ${label}: ${err.code}`);
  }
}

// Preflight schema check
async function ensureSchemaUpToDate() {
  const requiredColumns = [{ table: "User", column: "locationPermission" }];
  for (const { table, column } of requiredColumns) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      table,
      column
    );
    if (rows.length === 0) {
      throw new Error(
        `\n❌ Schema drift detected: column "${table}.${column}" is missing from the database.\n` +
        `   Run: npx prisma migrate deploy\n`
      );
    }
  }
}

// Deterministic UUIDs (RFC 4122 v4)
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
// 100 ULTRA-SENSITIVE FMCG ITEMS
// =========================================================================
const ULTRA_SENSITIVE_ITEMS = [
  { barcode: "6291105766388", name: "Mekelesha With Sheno Ghee 10g", category: "Ultra-Sensitive", unit: "pcs", price: 35.0 },
  { barcode: "6291105764223", name: "My Kishin Mekelsha 2g", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "1050052", name: "Family Iodized Table Salt 1kg", category: "Ultra-Sensitive", unit: "kg", price: 32.0 },
  { barcode: "1050057", name: "Deges Salt 1kg (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 30.0 },
  { barcode: "1050108", name: "Family Iodized Table Salt 500g", category: "Ultra-Sensitive", unit: "pcs", price: 18.0 },
  { barcode: "6291105764162", name: "My Kishin Alcha Spice 2.5g", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "1050018", name: "Bebeka Turmeric Powder 250g", category: "Ultra-Sensitive", unit: "pcs", price: 85.0 },
  { barcode: "1050058", name: "Deges Salt 500g (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 16.0 },
  { barcode: "2519301085459", name: "Deges Salt 700g (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 22.0 },
  { barcode: "2519301085435", name: "Deges Iodized Table Salt 1kg", category: "Ultra-Sensitive", unit: "kg", price: 30.0 },
  { barcode: "1060003", name: "Sugar 1kg", category: "Ultra-Sensitive", unit: "kg", price: 110.0 },
  { barcode: "6405090401517", name: "Brown Sugar 500g", category: "Ultra-Sensitive", unit: "pcs", price: 140.0 },
  { barcode: "6405090401500", name: "Icing Sugar 500g", category: "Ultra-Sensitive", unit: "pcs", price: 130.0 },
  { barcode: "6405090401524", name: "Stick Sugar 500g", category: "Ultra-Sensitive", unit: "pcs", price: 150.0 },
  { barcode: "6008155008968", name: "Sossi Soya Mince 10g", category: "Ultra-Sensitive", unit: "pcs", price: 20.0 },
  { barcode: "6008155016598", name: "Sossi Soya Chunks 90g", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "1070036", name: "Guada Meser Kek", category: "Ultra-Sensitive", unit: "kg", price: 195.0 },
  { barcode: "1070043", name: "Guada Ater Kek", category: "Ultra-Sensitive", unit: "kg", price: 135.0 },
  { barcode: "1070048", name: "Guada Defin Meser", category: "Ultra-Sensitive", unit: "kg", price: 180.0 },
  { barcode: "1070077", name: "Guada Ater Shero 1kg", category: "Ultra-Sensitive", unit: "kg", price: 160.0 },
  { barcode: "1070033", name: "Guada Gebes Kinche", category: "Ultra-Sensitive", unit: "kg", price: 95.0 },
  { barcode: "6008155021547", name: "Sossi Soya Chunks 180g", category: "Ultra-Sensitive", unit: "pcs", price: 125.0 },
  { barcode: "6008155021677", name: "Sossi Soya Mince 180g", category: "Ultra-Sensitive", unit: "pcs", price: 125.0 },
  { barcode: "1070032", name: "Guada Aja Kinche", category: "Ultra-Sensitive", unit: "kg", price: 105.0 },
  { barcode: "9555246360513", name: "Liba Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", price: 890.0 },
  { barcode: "6281102100056", name: "Oche Vegetable Ghee 1kg", category: "Ultra-Sensitive", unit: "pcs", price: 340.0 },
  { barcode: "8697158167079", name: "Dania Refined Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", price: 880.0 },
  { barcode: "8691313988851", name: "Omar Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", price: 895.0 },
  { barcode: "8681934019102", name: "Safya Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", price: 910.0 },
  { barcode: "8690983039689", name: "Omaar Pure Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", price: 900.0 },
  { barcode: "1030000", name: "Oche Vegetable Ghee 5kg", category: "Ultra-Sensitive", unit: "pcs", price: 1550.0 },
  { barcode: "1030004", name: "Kokeb Kana Sunflower Oil 1L (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 195.0 },
  { barcode: "8681407016294", name: "Aluu Pure Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", price: 885.0 },
  { barcode: "6132500710395", name: "Cebon El Mordjene Graisse Pure Vegetable 500g", category: "Ultra-Sensitive", unit: "pcs", price: 210.0 },
  { barcode: "725765214461", name: "Horizon Coffee 1kg", category: "Ultra-Sensitive", unit: "kg", price: 680.0 },
  { barcode: "725765214539", name: "Horizon Coffee 500g", category: "Ultra-Sensitive", unit: "pcs", price: 350.0 },
  { barcode: "725765214546", name: "Limmu Coffee 500g", category: "Ultra-Sensitive", unit: "pcs", price: 360.0 },
  { barcode: "725765214423", name: "Bebeka Coffee 1kg", category: "Ultra-Sensitive", unit: "kg", price: 690.0 },
  { barcode: "725765214522", name: "Gemadro Coffee 500g", category: "Ultra-Sensitive", unit: "pcs", price: 350.0 },
  { barcode: "725765214454", name: "Gemadro Coffee 1kg", category: "Ultra-Sensitive", unit: "kg", price: 680.0 },
  { barcode: "725765214492", name: "Bebeka Coffee 500g", category: "Ultra-Sensitive", unit: "pcs", price: 355.0 },
  { barcode: "725765214478", name: "Limmu Coffee 1kg", category: "Ultra-Sensitive", unit: "kg", price: 710.0 },
  { barcode: "725765214416", name: "Ayehu Coffee 1kg", category: "Ultra-Sensitive", unit: "kg", price: 670.0 },
  { barcode: "725765214508", name: "Beha Coffee 500g", category: "Ultra-Sensitive", unit: "pcs", price: 345.0 },
  { barcode: "2050002", name: "Farm Egg", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "2050010", name: "Liquid Egg", category: "Ultra-Sensitive", unit: "pcs", price: 180.0 },
  { barcode: "3020002", name: "Addis Gold Label Agriceft", category: "Ultra-Sensitive", unit: "box", price: 140.0 },
  { barcode: "3020004", name: "Wush Wush Tea Agriceft", category: "Ultra-Sensitive", unit: "box", price: 135.0 },
  { barcode: "725765195463", name: "Addis Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 160.0 },
  { barcode: "725765195524", name: "Green Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 175.0 },
  { barcode: "3020011", name: "Hibiscus Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "725765195517", name: "Cinnamon Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "725765195586", name: "Agriceft Moringa Tea", category: "Ultra-Sensitive", unit: "box", price: 190.0 },
  { barcode: "725765195548", name: "Ginger Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 185.0 },
  { barcode: "725765195531", name: "Chomomela Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "725765195555", name: "Mint Tea Bag Agriceft", category: "Ultra-Sensitive", unit: "box", price: 180.0 },
  { barcode: "61614116", name: "Knorr Beef Cube", category: "Ultra-Sensitive", unit: "pcs", price: 25.0 },
  { barcode: "1010010", name: "Tomato Paste 70g", category: "Ultra-Sensitive", unit: "pcs", price: 45.0 },
  { barcode: "1010004", name: "Merti Tomato Paste 850g", category: "Ultra-Sensitive", unit: "pcs", price: 260.0 },
  { barcode: "61614123", name: "Knorr Chicken", category: "Ultra-Sensitive", unit: "pcs", price: 25.0 },
  { barcode: "2390201379622", name: "Shola Pasterized Cow Milk", category: "Ultra-Sensitive", unit: "pcs", price: 50.0 },
  { barcode: "2020026", name: "Shola Lame Bottled Milk 500ml", category: "Ultra-Sensitive", unit: "pcs", price: 55.0 },
  { barcode: "2020025", name: "Shola Lame Bottled Milk 1L", category: "Ultra-Sensitive", unit: "pcs", price: 105.0 },
  { barcode: "2020036", name: "Shola Kido Milk 150ml", category: "Ultra-Sensitive", unit: "pcs", price: 25.0 },
  { barcode: "3010003", name: "Dega Natural Water 600ml", category: "Ultra-Sensitive", unit: "pcs", price: 22.0 },
  { barcode: "3010014", name: "Natural Mineral Water 300ml (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 10.0 },
  { barcode: "3010006", name: "Dega Natural Water 2L", category: "Ultra-Sensitive", unit: "pcs", price: 45.0 },
  { barcode: "3010004", name: "Dega Natural Water 1L", category: "Ultra-Sensitive", unit: "pcs", price: 32.0 },
  { barcode: "3010008", name: "Cheers 10L Water (With Jar)", category: "Ultra-Sensitive", unit: "pcs", price: 145.0 },
  { barcode: "3010002", name: "Cheers 20L Water (Without Jar)", category: "Ultra-Sensitive", unit: "pcs", price: 110.0 },
  { barcode: "5010148", name: "Mas Body Soap 25g", category: "Ultra-Sensitive", unit: "pcs", price: 22.0 },
  { barcode: "1301191001401", name: "Mas Body Soap 100g", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "8901842033602", name: "Mas Body Soap 75g", category: "Ultra-Sensitive", unit: "pcs", price: 50.0 },
  { barcode: "9060012", name: "Mas Hand Wash Mango 500ml", category: "Ultra-Sensitive", unit: "pcs", price: 165.0 },
  { barcode: "8690506062217", name: "Duru With Olive Oil 180g", category: "Ultra-Sensitive", unit: "pcs", price: 130.0 },
  { barcode: "67238891190", name: "Dove Beauty Soap Original 135g", category: "Ultra-Sensitive", unit: "pcs", price: 240.0 },
  { barcode: "6161115175626", name: "Lux Soap Jasmine 70g", category: "Ultra-Sensitive", unit: "pcs", price: 75.0 },
  { barcode: "6164004554601", name: "Lifebuoy Soap Bar Lemon 70g (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "6164004554595", name: "Lifebuoy Soap Total (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "6164004625714", name: "Lifebuoy Lemon Fresh 150g", category: "Ultra-Sensitive", unit: "pcs", price: 120.0 },
  { barcode: "5020022", name: "Vega Soap 250g", category: "Ultra-Sensitive", unit: "pcs", price: 55.0 },
  { barcode: "5020024", name: "Star 2000 Soap 200g", category: "Ultra-Sensitive", unit: "pcs", price: 48.0 },
  { barcode: "5010004", name: "Star Lime Vim 500g", category: "Ultra-Sensitive", unit: "pcs", price: 95.0 },
  { barcode: "5020003", name: "Goal Detergent Powder 500g", category: "Ultra-Sensitive", unit: "pcs", price: 110.0 },
  { barcode: "2512908763478", name: "Vitrex Soap 200g", category: "Ultra-Sensitive", unit: "pcs", price: 48.0 },
  { barcode: "8542235466739", name: "Star 2000 Soap 250g", category: "Ultra-Sensitive", unit: "pcs", price: 58.0 },
  { barcode: "5020033", name: "Goal Powder 30g", category: "Ultra-Sensitive", unit: "pcs", price: 15.0 },
  { barcode: "8542235466746", name: "Virtex Soap 230g", category: "Ultra-Sensitive", unit: "pcs", price: 54.0 },
  { barcode: "5010097", name: "Goal Powder 200g", category: "Ultra-Sensitive", unit: "pcs", price: 55.0 },
  { barcode: "36000291452", name: "Vega Powder 100g", category: "Ultra-Sensitive", unit: "pcs", price: 30.0 },
  { barcode: "2020016", name: "Shola Lame Yoghurt 500ml", category: "Ultra-Sensitive", unit: "pcs", price: 65.0 },
  { barcode: "9200387298569", name: "Suprema Spaghetti 500g", category: "Ultra-Sensitive", unit: "pcs", price: 78.0 },
  { barcode: "6253501820927", name: "Oche Pasta 500g", category: "Ultra-Sensitive", unit: "pcs", price: 75.0 },
  { barcode: "6281178494776", name: "Oche Macaroni 500g", category: "Ultra-Sensitive", unit: "pcs", price: 75.0 },
  { barcode: "1070066", name: "Suprema Macaroni Elbow 500g", category: "Ultra-Sensitive", unit: "pcs", price: 78.0 },
  { barcode: "184375194387", name: "Ricco Macaroni Pasta 500g", category: "Ultra-Sensitive", unit: "pcs", price: 82.0 },
  { barcode: "184375194318", name: "Ricco Pasta Stelline 500g", category: "Ultra-Sensitive", unit: "pcs", price: 82.0 },
  { barcode: "8697480065036", name: "Santa Sophia Lasagna 400g", category: "Ultra-Sensitive", unit: "pcs", price: 195.0 },
  { barcode: "6224008372202", name: "Milano Vermicelli Macaroni 500g", category: "Ultra-Sensitive", unit: "pcs", price: 88.0 },
  { barcode: "6223001513445", name: "Italino Premium Lasagna 400g (Pcs)", category: "Ultra-Sensitive", unit: "pcs", price: 210.0 },
];

// =========================================================================
// 20 DAILY LOW FRESH PRODUCE & STAPLE ITEMS
// =========================================================================
const DAILY_LOW_PRICE_ITEMS = [
  // Vegetables
  { barcode: "DLP-VEG-01", name: "Red Onion", category: "Fresh", unit: "kg", price: 64.0 },
  { barcode: "DLP-VEG-02", name: "Tomato", category: "Fresh", unit: "kg", price: 55.0 },
  { barcode: "DLP-VEG-03", name: "Potato", category: "Fresh", unit: "kg", price: 48.0 },
  { barcode: "DLP-VEG-04", name: "Kell Cabbage", category: "Fresh", unit: "kg", price: 35.0 },
  { barcode: "DLP-VEG-05", name: "Hot Peppers", category: "Fresh", unit: "kg", price: 120.0 },
  { barcode: "DLP-VEG-06", name: "Garlic", category: "Fresh", unit: "kg", price: 260.0 },
  { barcode: "DLP-VEG-07", name: "Carrot", category: "Fresh", unit: "kg", price: 42.0 },
  // Fruits
  { barcode: "DLP-FRU-01", name: "Orange", category: "Fresh", unit: "kg", price: 130.0 },
  { barcode: "DLP-FRU-02", name: "Papaye", category: "Fresh", unit: "kg", price: 85.0 },
  { barcode: "DLP-FRU-03", name: "Avocado", category: "Fresh", unit: "kg", price: 95.0 },
  { barcode: "DLP-FRU-04", name: "Banana", category: "Fresh", unit: "kg", price: 75.0 },
  { barcode: "DLP-FRU-05", name: "Lemmon", category: "Fresh", unit: "kg", price: 90.0 },
  // Dairy
  { barcode: "DLP-DAI-01", name: "Lame Milk 500ml", category: "Dairy", unit: "pcs", price: 55.0 },
  { barcode: "DLP-DAI-02", name: "Lame Yoghurt 500ml", category: "Dairy", unit: "pcs", price: 65.0 },
  { barcode: "DLP-DAI-03", name: "Lame Cheese", category: "Dairy", unit: "kg", price: 240.0 },
  { barcode: "DLP-DAI-04", name: "Farm Egg (Crate)", category: "Dairy", unit: "crate", price: 420.0 },
  // Meat
  { barcode: "DLP-MEA-01", name: "Top Side Meat (Nekele)", category: "Meat", unit: "kg", price: 980.0 },
  { barcode: "DLP-MEA-02", name: "Chunk Meat (Yewet Sega)", category: "Meat", unit: "kg", price: 850.0 },
  { barcode: "DLP-MEA-03", name: "Lamb Carcass (Yebeg Sega)", category: "Meat", unit: "kg", price: 920.0 },
  // Poultry
  { barcode: "DLP-PLT-01", name: "Whole Chicken", category: "Poultry", unit: "pcs", price: 650.0 },
];

async function main() {
  console.log("🌱 [Aires-BI] Production Initializer starting...\n");

  await ensureSchemaUpToDate();

  console.log("🧹 Clearing previous data (FK-safe order)...");
  await safeDelete("Alert", () => prisma.alert.deleteMany());
  await safeDelete("PriceAnalysis", () => prisma.priceAnalysis.deleteMany());
  await safeDelete("PriceObservation", () => prisma.priceObservation.deleteMany());
  await safeDelete("Audit", () => prisma.audit.deleteMany());
  await safeDelete("AssignmentItem", () => prisma.assignmentItem.deleteMany());
  await safeDelete("SurveyAssignment", () => prisma.surveyAssignment.deleteMany());
  await safeDelete("QueensPrice", () => prisma.queensPrice.deleteMany());
  await safeDelete("Product", () => prisma.product.deleteMany());
  await safeDelete("Store", () => prisma.store.deleteMany());
  await safeDelete("Competitor", () => prisma.competitor.deleteMany());
  await safeDelete("SurveyPeriod", () => prisma.surveyPeriod.deleteMany());
  await safeDelete("User", () => prisma.user.deleteMany());
  console.log("   ✅ Clean slate established.\n");

  // 1. Users
  const passwordHash = await bcrypt.hash(
    process.env.SEED_DEFAULT_PASSWORD || "Aires@2026",
    10
  );

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
      name: "Dawit Haile",
      email: "agent1@aires.et",
      phone: "+251911223344",
      role: "FIELD_AUDITOR",
    },
    {
      id: UID.users.agent2,
      name: "Marta Girma",
      email: "agent2@aires.et",
      phone: "+251911223345",
      role: "FIELD_AUDITOR",
    },
    {
      id: UID.users.agent3,
      name: "Yared Tadesse",
      email: "agent3@aires.et",
      phone: "+251911223346",
      role: "FIELD_AUDITOR",
    },
    {
      id: UID.users.agent4,
      name: "Selam Fikru",
      email: "agent4@aires.et",
      phone: "+251911223347",
      role: "FIELD_AUDITOR",
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash, active: true } });
  }
  console.log(`✅ Seeded ${users.length} System Users`);

  // 2. Competitors
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

  // 3. Physical Stores with Valid GPS Anchors
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
  console.log(`✅ Seeded ${stores.length} Physical Competitor Stores`);

  // 4. Products + Official Queen's Benchmark Prices (Title Cased)
  const allProducts = [...ULTRA_SENSITIVE_ITEMS, ...DAILY_LOW_PRICE_ITEMS];
  const createdProducts = [];
  const BENCHMARK_EFFECTIVE_FROM = new Date("2026-09-15T00:00:00Z");

  for (const [idx, item] of allProducts.entries()) {
    const id = `40000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`;
    const formattedTitle = toTitleCase(item.name);

    const product = await prisma.product.create({
      data: {
        id,
        name: formattedTitle,
        barcode: item.barcode,
        sku: item.barcode,
        category: item.category,
        unit: item.unit,
        active: true,
      },
    });
    createdProducts.push(product);

    // Initial official benchmark price
    await prisma.queensPrice.create({
      data: {
        productId: product.id,
        price: item.price,
        effectiveFrom: BENCHMARK_EFFECTIVE_FROM,
        effectiveTo: null,
        source: "Queen's Official Pricing Strategy",
      },
    });
  }
  console.log(
    `✅ Seeded ${createdProducts.length} Products (Title Cased) with Active Benchmark Prices`
  );

  // 5. Survey Period (2026-W39 Open Operational Cycle)
  const period = await prisma.surveyPeriod.create({
    data: {
      id: "2026-W39",
      name: "Week 39 Retail Survey Cycle 2026",
      startDate: new Date("2026-09-25T00:00:00Z"),
      endDate: new Date("2026-10-02T23:59:59Z"),
      status: "OPEN",
    },
  });
  console.log(`✅ Seeded Survey Period: ${period.id} (OPEN)`);

  // 6. Assignments, Full Checklists & Audits (Neutral NOT_STARTED State)
  const assignmentPlan = [
    {
      key: "agent1",
      auditorId: UID.users.agent1,
      storeId: UID.stores.allmartBole,
    },
    {
      key: "agent2",
      auditorId: UID.users.agent2,
      storeId: UID.stores.abadirPiassa,
    },
    {
      key: "agent3",
      auditorId: UID.users.agent3,
      storeId: UID.stores.shoaBole,
    },
    {
      key: "agent4",
      auditorId: UID.users.agent4,
      storeId: UID.stores.bambisKazanchis,
    },
  ];

  for (const plan of assignmentPlan) {
    const assignmentId = UID.assignments[plan.key];
    const auditId = UID.audits[plan.key];

    // Assignment
    await prisma.surveyAssignment.create({
      data: {
        id: assignmentId,
        auditorId: plan.auditorId,
        storeId: plan.storeId,
        surveyPeriodId: period.id,
        status: "NOT_STARTED",
        startedAt: null,
        completedAt: null,
      },
    });

    // Attach all 120 products as mandatory checklist items
    const itemsData = createdProducts.map((p) => ({
      assignmentId,
      productId: p.id,
      required: true,
    }));
    await prisma.assignmentItem.createMany({ data: itemsData });

    // Matching Field Visit (Audit) in clean NOT_STARTED state (GPS coordinates null)
    await prisma.audit.create({
      data: {
        id: auditId,
        assignmentId,
        auditorId: plan.auditorId,
        storeId: plan.storeId,
        surveyPeriodId: period.id,
        status: "NOT_STARTED",
        startedAt: null,
        completedAt: null,
        startLatitude: null,
        startLongitude: null,
        startAccuracyMeters: null,
      },
    });
  }

  console.log(
    `✅ Seeded ${assignmentPlan.length} Assignments & Audits in NOT_STARTED state (GPS null, ready for live collection)`
  );

  // 7. Production Policy: Zero Fake Data
  console.log(
    "🛡️  [PRODUCTION POLICY] PriceObservation, PriceAnalysis, and Alert seeded with 0 rows (generated strictly by live audits)."
  );

  console.log("\n🎉 [Aires-BI] Production database initialization complete!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });