import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/db.js";

async function main() {
  console.log("🌱 [Aires-BI] Seeding Pilot Database with Prisma 7...");

  // 1. Clean existing records in referential order
  await prisma.alert.deleteMany();
  await prisma.surveyEntry.deleteMany();
  await prisma.surveyAssignment.deleteMany();
  await prisma.surveyPeriod.deleteMany();
  await prisma.product.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users with hashed password
  const passwordHash = await bcrypt.hash("Aires@2026", 10);

  const dawit = await prisma.user.create({
    data: {
      id: "USR-001",
      name: "Dawit Haile",
      email: "dawit.auditor@aires.et",
      phone: "+251911223344",
      passwordHash,
      role: "FIELD_AUDITOR",
      active: true,
      assignedCompetitors: ["shoa", "allmart", "fresh-corner"],
      assignedMarkets: ["Shoa Supermarket", "Allmart Supermarket"],
    },
  });

  const tigist = await prisma.user.create({
    data: {
      id: "USR-002",
      name: "Tigist Alemu",
      email: "tigist.manager@aires.et",
      phone: "+251922334455",
      passwordHash,
      role: "MANAGER",
      active: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      id: "USR-003",
      name: "Admin Aires",
      email: "admin@aires.et",
      phone: "+251933445566",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log(`✅ Seeded 3 Users: ${dawit.name}, ${tigist.name}, ${admin.name}`);

  // 3. Seed Competitors
  const competitorsData = [
    { id: "allmart", name: "Allmart", market: "Allmart Supermarket", type: "FMCG", active: true },
    { id: "abadir", name: "Abadir", market: "Abadir Supermarket", type: "FMCG", active: true },
    { id: "shoa", name: "Shoa", market: "Shoa Supermarket", type: "FMCG", active: true },
    { id: "bambis", name: "Bambis", market: "Bambis Supermarket", type: "FMCG", active: true },
    { id: "fresh-corner", name: "Fresh Corner", market: "Fresh Corner Market", type: "Fresh", active: true },
    { id: "garment-market", name: "Garment Vegetable Market", market: "Garment Market", type: "Fresh", active: true },
    { id: "straight-market", name: "Straight Market", market: "Straight Fresh Market", type: "Fresh", active: true },
  ];

  for (const comp of competitorsData) {
    await prisma.competitor.create({ data: comp });
  }
  console.log(`✅ Seeded ${competitorsData.length} Competitors`);

  // 4. Seed Products with Queens Benchmark Prices
  const productsData = [
    { id: "Veg-01", name: "Red Onion", category: "Fresh", unit: "kg", queensPrice: 64.0, active: true },
    { id: "Veg-02", name: "Potato", category: "Fresh", unit: "kg", queensPrice: 48.0, active: true },
    { id: "Veg-03", name: "Tomato", category: "Fresh", unit: "kg", queensPrice: 55.0, active: true },
    { id: "Veg-04", name: "Carrot", category: "Fresh", unit: "kg", queensPrice: 42.0, active: true },
    { id: "Dry-01", name: "Wheat Flour 5kg", category: "Dry", unit: "pcs", queensPrice: 380.0, active: true },
    { id: "Dry-02", name: "Sunflower Oil 5L", category: "Ultra-Sensitive", unit: "pcs", queensPrice: 890.0, active: true },
    { id: "Dry-03", name: "Sugar 1kg", category: "Sensitive", unit: "kg", queensPrice: 110.0, active: true },
    { id: "Dry-04", name: "Spaghetti 500g", category: "Non-Sensitive", unit: "pcs", queensPrice: 75.0, active: true },
  ];

  for (const prod of productsData) {
    await prisma.product.create({ data: prod });
  }
  console.log(`✅ Seeded ${productsData.length} Products`);

  // 5. Seed Weekly Survey Period
  const period = await prisma.surveyPeriod.create({
    data: {
      id: "2026-W39",
      startDate: new Date("2026-09-21T00:00:00Z"),
      endDate: new Date("2026-09-25T23:59:59Z"),
      status: "OPEN",
    },
  });
  console.log(`✅ Seeded Survey Period: ${period.id}`);

  // 6. Seed Assignments
  const asnShoa = await prisma.surveyAssignment.create({
    data: {
      id: "ASN-001",
      auditorId: dawit.id,
      competitorId: "shoa",
      marketName: "Shoa Supermarket",
      surveyPeriodId: period.id,
      items: ["Veg-01", "Veg-02", "Veg-03", "Dry-01", "Dry-02"],
      status: "IN_PROGRESS",
    },
  });

  const asnAllmart = await prisma.surveyAssignment.create({
    data: {
      id: "ASN-002",
      auditorId: dawit.id,
      competitorId: "allmart",
      marketName: "Allmart Supermarket",
      surveyPeriodId: period.id,
      items: ["Veg-01", "Veg-02", "Dry-02", "Dry-03"],
      status: "IN_PROGRESS",
    },
  });
  console.log(`✅ Seeded Assignments (${asnShoa.id}, ${asnAllmart.id})`);

  // 7. Seed Initial Field Survey Entries (GPS locked)
  await prisma.surveyEntry.createMany({
    data: [
      {
        id: "SUR-00001",
        itemId: "Veg-01",
        competitorId: "shoa",
        marketName: "Shoa Supermarket",
        auditorId: dawit.id,
        surveyPeriodId: period.id,
        price: 62.0,
        unit: "kg",
        latitude: 9.032,
        longitude: 38.7469,
        accuracy: 8.0,
        syncStatus: "SYNCED",
      },
      {
        id: "SUR-00002",
        itemId: "Veg-01",
        competitorId: "allmart",
        marketName: "Allmart Supermarket",
        auditorId: dawit.id,
        surveyPeriodId: period.id,
        price: 58.6,
        unit: "kg",
        latitude: 9.0285,
        longitude: 38.7512,
        accuracy: 6.0,
        syncStatus: "SYNCED",
      },
      {
        id: "SUR-00003",
        itemId: "Dry-02",
        competitorId: "shoa",
        marketName: "Shoa Supermarket",
        auditorId: dawit.id,
        surveyPeriodId: period.id,
        price: 940.0,
        unit: "pcs",
        latitude: 9.032,
        longitude: 38.7469,
        accuracy: 8.0,
        syncStatus: "SYNCED",
      },
    ],
  });
  console.log("✅ Seeded Initial Field Survey Entries");

  console.log("🎉 [Aires-BI] Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });