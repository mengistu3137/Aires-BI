import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/db.js";

async function safeDelete(modelName, deleteFn) {
  try {
    await deleteFn();
  } catch (err) {
    if (err.code !== "P2021") throw err;
  }
}

// =========================================================================
// REAL QUEEN'S INVESTIGATION CATALOG (100 ULTRA-SENSITIVE + 20 DAILY LOW)
// Source: Midroc Investment Group / Queen's Supermarket Doc: ኩዊንስ-አኮ-2019-002
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
  // Vegetables (7 items)
  { barcode: "DLP-VEG-01", name: "RED ONION", category: "Fresh", unit: "kg", price: 64.0 },
  { barcode: "DLP-VEG-02", name: "TOMATO", category: "Fresh", unit: "kg", price: 55.0 },
  { barcode: "DLP-VEG-03", name: "POTATO", category: "Fresh", unit: "kg", price: 48.0 },
  { barcode: "DLP-VEG-04", name: "KELL CABBAGE", category: "Fresh", unit: "kg", price: 35.0 },
  { barcode: "DLP-VEG-05", name: "HOT PEPPERS", category: "Fresh", unit: "kg", price: 120.0 },
  { barcode: "DLP-VEG-06", name: "GARLIC", category: "Fresh", unit: "kg", price: 260.0 },
  { barcode: "DLP-VEG-07", name: "CARROT", category: "Fresh", unit: "kg", price: 42.0 },

  // Fruits (5 items)
  { barcode: "DLP-FRU-01", name: "ORANGE", category: "Fresh", unit: "kg", price: 130.0 },
  { barcode: "DLP-FRU-02", name: "PAPAYE", category: "Fresh", unit: "kg", price: 85.0 },
  { barcode: "DLP-FRU-03", name: "AVOCADO", category: "Fresh", unit: "kg", price: 95.0 },
  { barcode: "DLP-FRU-04", name: "BANANA", category: "Fresh", unit: "kg", price: 75.0 },
  { barcode: "DLP-FRU-05", name: "LEMMON", category: "Fresh", unit: "kg", price: 90.0 },

  // Dairy Products (4 items)
  { barcode: "DLP-DAI-01", name: "LAME MILK 500L", category: "Dairy", unit: "pcs", price: 55.0 },
  { barcode: "DLP-DAI-02", name: "LAME YOGHURT 500ML", category: "Dairy", unit: "pcs", price: 65.0 },
  { barcode: "DLP-DAI-03", name: "LAME CHEESE", category: "Dairy", unit: "kg", price: 240.0 },
  { barcode: "DLP-DAI-04", name: "FARM EGG", category: "Dairy", unit: "crate", price: 420.0 },

  // Meat Products (3 items)
  { barcode: "DLP-MEA-01", name: "TOP SIDE MEAT (NEKELE)", category: "Meat", unit: "kg", price: 980.0 },
  { barcode: "DLP-MEA-02", name: "CHUNCK MEAT (YEWET SEGA)", category: "Meat", unit: "kg", price: 850.0 },
  { barcode: "DLP-MEA-03", name: "LAMB CARACASS (YEBEG SEGA)", category: "Meat", unit: "kg", price: 920.0 },

  // Poultry (1 item)
  { barcode: "DLP-PLT-01", name: "WHOLE CHICKEN", category: "Poultry", unit: "pcs", price: 650.0 },
];

async function main() {
  console.log("🌱 [Aires-BI Iteration 3] Seeding Real 120-Product Investigation Dataset...");

  // 1. Clean previous data safely
  console.log("🧹 Clearing previous tables...");
  await safeDelete("Alert", () => prisma.alert.deleteMany());
  await safeDelete("PriceAnalysis", () => prisma.priceAnalysis.deleteMany());
  await safeDelete("PriceObservation", () => prisma.priceObservation.deleteMany());
  await safeDelete("Audit", () => prisma.audit.deleteMany());
  await safeDelete("AssignmentItem", () => prisma.assignmentItem.deleteMany());
  await safeDelete("SurveyAssignment", () => prisma.surveyAssignment.deleteMany());
  await safeDelete("SurveyPeriod", () => prisma.surveyPeriod.deleteMany());
  await safeDelete("QueensPrice", () => prisma.queensPrice.deleteMany());
  await safeDelete("Product", () => prisma.product.deleteMany());
  await safeDelete("Store", () => prisma.store.deleteMany());
  await safeDelete("Competitor", () => prisma.competitor.deleteMany());
  await safeDelete("User", () => prisma.user.deleteMany());

  // 2. Seed Real Users (Project lead + 4 field data collectors)
  const passwordHash = await bcrypt.hash("Aires@2026", 10);

  const users = [
    { id: "USR-001", name: "Abraham Shiferaw", email: "abraham.admin@aires.et", phone: "+251911000001", role: "ADMIN" },
    { id: "USR-002", name: "Endalkachew Girma", email: "endalkachew.manager@aires.et", phone: "+251911000002", role: "MANAGER" },
    { id: "USR-003", name: "Dawit Haile (Agent 1)", email: "agent1@aires.et", phone: "+251911223344", role: "FIELD_AUDITOR" },
    { id: "USR-004", name: "Marta Girma (Agent 2)", email: "agent2@aires.et", phone: "+251911223345", role: "FIELD_AUDITOR" },
    { id: "USR-005", name: "Yared Tadesse (Agent 3)", email: "agent3@aires.et", phone: "+251911223346", role: "FIELD_AUDITOR" },
    { id: "USR-006", name: "Selam Fikru (Agent 4)", email: "agent4@aires.et", phone: "+251911223347", role: "FIELD_AUDITOR" },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: { ...u, passwordHash, active: true },
    });
  }
  console.log(`✅ Seeded ${users.length} Operational Users`);

  // 3. Seed Competitors
  const competitors = [
    { id: "allmart", name: "Allmart", type: "FMCG" },
    { id: "abadir", name: "Abadir", type: "FMCG" },
    { id: "shoa", name: "Shoa", type: "FMCG" },
    { id: "bambis", name: "Bambis", type: "FMCG" },
    { id: "fresh-corner", name: "Fresh Corner", type: "FRESH" },
    { id: "garment-market", name: "Garment Vegetable Market", type: "FRESH" },
    { id: "straight-market", name: "Straight Market", type: "FRESH" },
  ];

  for (const c of competitors) {
    await prisma.competitor.create({
      data: { ...c, active: true },
    });
  }
  console.log(`✅ Seeded ${competitors.length} Competitors`);

  // 4. Seed Physical Stores with Coordinates
  const stores = [
    { id: "STR-ALLMART-BOLE", competitorId: "allmart", name: "Allmart Supermarket - Bole", address: "Bole Medhanialem Road", area: "Bole", type: "FMCG", latitude: 8.998412, longitude: 38.78652 },
    { id: "STR-ABADIR-PIASSA", competitorId: "abadir", name: "Abadir Supermarket - Piassa", address: "Churchill Ave", area: "Piassa", type: "FMCG", latitude: 9.03045, longitude: 38.7521 },
    { id: "STR-SHOA-BOLE", competitorId: "shoa", name: "Shoa Supermarket - Bole Road", address: "Africa Avenue", area: "Bole", type: "FMCG", latitude: 9.00124, longitude: 38.77123 },
    { id: "STR-BAMBIS-KAZANCHIS", competitorId: "bambis", name: "Bambis Supermarket - Kazanchis", address: "Jomo Kenyatta St", area: "Kazanchis", type: "FMCG", latitude: 9.01567, longitude: 38.7698 },
    { id: "STR-FRESH-CORNER-OLD-AIRPORT", competitorId: "fresh-corner", name: "Fresh Corner - Old Airport", address: "South Africa St", area: "Old Airport", type: "FRESH", latitude: 8.9892, longitude: 38.7345 },
    { id: "STR-GARMENT-MARKET", competitorId: "garment-market", name: "Garment Vegetable Market - Jomo", address: "Garment Roundabout", area: "Jomo", type: "FRESH", latitude: 8.9654, longitude: 38.7241 },
    { id: "STR-STRAIGHT-MARKET-SARIS", competitorId: "straight-market", name: "Straight Market - Saris", address: "Debre Zeit Road", area: "Saris", type: "FRESH", latitude: 8.9482, longitude: 38.7615 },
  ];

  for (const s of stores) {
    await prisma.store.create({
      data: { ...s, city: "Addis Ababa", active: true },
    });
  }
  console.log(`✅ Seeded ${stores.length} Physical Stores`);

  // 5. Seed Real 120 Products (100 Ultra-Sensitive + 20 Daily Low Price)
  const allProducts = [...ULTRA_SENSITIVE_ITEMS, ...DAILY_LOW_PRICE_ITEMS];
  const createdProducts = [];

  for (const [idx, item] of allProducts.entries()) {
    const id = `PROD-${String(idx + 1).padStart(3, "0")}`;
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

    // Initial Queens benchmark price record
    await prisma.queensPrice.create({
      data: {
        productId: product.id,
        price: item.price,
        effectiveFrom: new Date("2026-09-15T00:00:00Z"),
        source: "Queen's Official Pricing Strategy",
      },
    });
  }
  console.log(`✅ Seeded ${createdProducts.length} Real Products with Historical Queens Benchmark Prices`);

  // 6. Seed Survey Period: Meskerem 15 – 22, 2019 E.C. (September 25 – October 2, 2026 G.C.)
  const period = await prisma.surveyPeriod.create({
    data: {
      id: "2026-W39",
      name: "Queen's Meskerem 15-22 Competitor Survey",
      startDate: new Date("2026-09-25T00:00:00Z"),
      endDate: new Date("2026-10-02T23:59:59Z"),
      status: "OPEN",
    },
  });
  console.log(`✅ Seeded Survey Period: ${period.id} (${period.name})`);

  // 7. Seed Real Assignments for the 4 Field Auditors
  const assignmentsData = [
    { auditorId: "USR-003", storeId: "STR-ALLMART-BOLE" },       // Agent 1 -> Allmart Bole
    { auditorId: "USR-004", storeId: "STR-ABADIR-PIASSA" },      // Agent 2 -> Abadir Piassa
    { auditorId: "USR-005", storeId: "STR-SHOA-BOLE" },          // Agent 3 -> Shoa Bole
    { auditorId: "USR-006", storeId: "STR-BAMBIS-KAZANCHIS" },   // Agent 4 -> Bambis Kazanchis
  ];

  for (const asn of assignmentsData) {
    const createdAsn = await prisma.surveyAssignment.create({
      data: {
        auditorId: asn.auditorId,
        storeId: asn.storeId,
        surveyPeriodId: period.id,
        status: "IN_PROGRESS",
        startedAt: new Date("2026-09-25T08:00:00Z"),
      },
    });

    // Assign all 120 items to each store assignment
    const itemsData = createdProducts.map((p) => ({
      assignmentId: createdAsn.id,
      productId: p.id,
      required: true,
    }));
    await prisma.assignmentItem.createMany({ data: itemsData });
  }
  console.log(`✅ Seeded 4 Real Store Assignments (Each with ${createdProducts.length} assigned investigation items)`);

  console.log("\n🎉 [Aires-BI Iteration 3] 120-Product Database Seed Complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });