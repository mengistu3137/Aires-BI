import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/db.js";
import {
  PILOT_USERS,
  PILOT_COMPETITORS,
  PILOT_STORES,
  PILOT_PRODUCTS_20,
} from "../src/config/pilot-data.js";

async function main() {
  console.log("🌱 [Aires-BI Iteration 2] Seeding Production Relational Database...");

  // 1. Clean existing records in referential order
  console.log("🧹 Clearing previous tables...");
  await prisma.alert.deleteMany();
  await prisma.priceAnalysis.deleteMany();
  await prisma.priceObservation.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.assignmentItem.deleteMany();
  await prisma.surveyAssignment.deleteMany();
  await prisma.surveyPeriod.deleteMany();
  await prisma.queensPrice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users (1 Admin, 1 Manager, 4 Field Auditors)
  const passwordHash = await bcrypt.hash("Aires@2026", 10);
  const createdUsers = [];

  for (const user of PILOT_USERS) {
    const created = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash,
        role: user.role,
        active: user.active,
      },
    });
    createdUsers.push(created);
  }
  console.log(`✅ Seeded ${createdUsers.length} Users (1 Admin, 1 Manager, 4 Auditors)`);

  // 3. Seed Competitors
  for (const comp of PILOT_COMPETITORS) {
    await prisma.competitor.create({
      data: {
        id: comp.id,
        name: comp.name,
        type: comp.type,
        active: comp.active,
      },
    });
  }
  console.log(`✅ Seeded ${PILOT_COMPETITORS.length} Competitor Businesses`);

  // 4. Seed Physical Store Locations with GPS coordinates
  for (const store of PILOT_STORES) {
    await prisma.store.create({
      data: {
        id: store.id,
        competitorId: store.competitorId,
        name: store.name,
        address: store.address,
        city: store.city,
        area: store.area,
        type: store.type,
        latitude: store.latitude,
        longitude: store.longitude,
        active: store.active,
      },
    });
  }
  console.log(`✅ Seeded ${PILOT_STORES.length} Physical Store Locations`);

  // 5. Seed 20 Representative Products + Queens Price History
  for (const prod of PILOT_PRODUCTS_20) {
    await prisma.product.create({
      data: {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        sku: prod.sku,
        barcode: prod.barcode,
        active: prod.active,
      },
    });

    // Create current effective Queens benchmark price
    await prisma.queensPrice.create({
      data: {
        productId: prod.id,
        price: prod.queensPrice,
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        source: "Queens Supermarket ERP Benchmark",
      },
    });
  }
  console.log(`✅ Seeded ${PILOT_PRODUCTS_20.length} Master Products with Queens Price History`);

  // 6. Seed Survey Period (2026-W39)
  const period = await prisma.surveyPeriod.create({
    data: {
      id: "2026-W39",
      name: "Week 39 Retail Survey Cycle 2026",
      startDate: new Date("2026-09-21T00:00:00Z"),
      endDate: new Date("2026-09-27T23:59:59Z"),
      status: "OPEN",
    },
  });
  console.log(`✅ Seeded Survey Period: ${period.id} (${period.status})`);

  // 7. Seed Survey Assignments (Map 4 Field Auditors to target stores)
  const assignmentsConfig = [
    { auditorId: "USR-003", storeId: "STR-ALLMART-BOLE" }, // Agent 1 -> Allmart Bole
    { auditorId: "USR-004", storeId: "STR-ABADIR-PIASSA" }, // Agent 2 -> Abadir Piassa
    { auditorId: "USR-005", storeId: "STR-SHOA-BOLE" },     // Agent 3 -> Shoa Bole
    { auditorId: "USR-006", storeId: "STR-BAMBIS-KAZANCHIS" }, // Agent 4 -> Bambis Kazanchis
  ];

  const createdAssignments = [];
  for (const config of assignmentsConfig) {
    const assignment = await prisma.surveyAssignment.create({
      data: {
        auditorId: config.auditorId,
        storeId: config.storeId,
        surveyPeriodId: period.id,
        status: "IN_PROGRESS",
        startedAt: new Date("2026-09-22T08:00:00Z"),
      },
    });
    createdAssignments.push(assignment);

    // Assign all 20 products to this store audit
    const itemRecords = PILOT_PRODUCTS_20.map((p) => ({
      assignmentId: assignment.id,
      productId: p.id,
      required: true,
    }));
    await prisma.assignmentItem.createMany({ data: itemRecords });
  }
  console.log(`✅ Seeded ${createdAssignments.length} Assignments with 20 assigned items each`);

  // 8. Seed Store Visit Audit for Agent 1 at Allmart Bole
  const auditAgent1 = await prisma.audit.create({
    data: {
      id: "AUD-001",
      assignmentId: createdAssignments[0].id,
      auditorId: "USR-003", // Agent 1
      storeId: "STR-ALLMART-BOLE",
      surveyPeriodId: period.id,
      status: "IN_PROGRESS",
      startedAt: new Date("2026-09-22T09:15:00Z"),
      startLatitude: 8.9984200,
      startLongitude: 38.7865100,
      startAccuracyMeters: 6.5,
      distanceFromStoreMeters: 12.4,
      gpsValid: true,
      notes: "Arrived at Allmart Bole. Starting fresh produce and staples aisle check.",
    },
  });

  // Seed sample price observations (including OUT_OF_STOCK demonstration)
  await prisma.priceObservation.createMany({
    data: [
      {
        clientObservationId: "OBS-ALLMART-VEG01",
        auditId: auditAgent1.id,
        productId: "VEG-01", // Red Onion
        auditorId: "USR-003",
        availability: "AVAILABLE",
        price: 58.50, // Queens is 64.00 -> Min comp
        observedUnit: "kg",
        latitude: 8.9984250,
        longitude: 38.7865150,
        accuracyMeters: 5.0,
        capturedAt: new Date("2026-09-22T09:22:15Z"),
        syncStatus: "SYNCED",
        reviewStatus: "APPROVED",
        syncedAt: new Date("2026-09-22T09:25:00Z"),
      },
      {
        clientObservationId: "OBS-ALLMART-EDO01",
        auditId: auditAgent1.id,
        productId: "EDO-01", // Sunflower Oil 5L
        auditorId: "USR-003",
        availability: "AVAILABLE",
        price: 920.00,
        observedUnit: "pcs",
        latitude: 8.9984300,
        longitude: 38.7865200,
        accuracyMeters: 5.0,
        capturedAt: new Date("2026-09-22T09:30:10Z"),
        syncStatus: "SYNCED",
        reviewStatus: "PENDING",
        syncedAt: new Date("2026-09-22T09:35:00Z"),
      },
      {
        clientObservationId: "OBS-ALLMART-SUG01",
        auditId: auditAgent1.id,
        productId: "SUG-01", // White Sugar 1kg
        auditorId: "USR-003",
        availability: "OUT_OF_STOCK", // Out of stock demonstration: price is null
        price: null,
        observedUnit: "kg",
        latitude: 8.9984300,
        longitude: 38.7865200,
        accuracyMeters: 6.0,
        capturedAt: new Date("2026-09-22T09:35:40Z"),
        syncStatus: "SYNCED",
        reviewStatus: "APPROVED",
        notes: "Shelf tag present, but bay empty. Out of stock confirmed.",
        syncedAt: new Date("2026-09-22T09:40:00Z"),
      },
    ],
  });
  console.log("✅ Seeded Store Audit & Initial Price Observations");

  // 9. Seed Sample Price Analysis Record (Min Competitor & Price Index)
  // Formula: Index = (Queens Price / Min Competitor Price) * 100
  // Red Onion: Queens = 64.00, Min Comp (Allmart) = 58.50 -> Index = (64 / 58.50) * 100 = 109.40% -> Action = PRICE_DOWN
  await prisma.priceAnalysis.create({
    data: {
      productId: "VEG-01",
      surveyPeriodId: period.id,
      queensPrice: 64.00,
      minimumCompetitorPrice: 58.50,
      competitorAveragePrice: 60.25,
      priceIndex: 1.09, // 109.4%
      targetIndex: 0.95,
      action: "PRICE_DOWN",
      notes: "Queens is 9.4% above Allmart minimum. Price Down recommended.",
    },
  });

  // Seed High Severity Alert
  await prisma.alert.create({
    data: {
      productId: "VEG-01",
      surveyPeriodId: period.id,
      type: "PRICE_DOWN",
      severity: "HIGH",
      message: "Red Onion Queens price (64.00) exceeds minimum competitor (58.50 by 9.4%).",
      queensPrice: 64.00,
      competitorPrice: 58.50,
      priceIndex: 1.09,
      resolved: false,
    },
  });
  console.log("✅ Seeded Price Analysis & Alert Demonstration");

  console.log("\n🎉 [Aires-BI Iteration 2] Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });