
import "dotenv/config";

import prisma from "../src/config/db.js";


async function main() {
    console.log("🌱 Seeding Aires-BI Groq AI Test Scenario...");

    const PERIOD_ID = "2026-W40";

    // 1. Create Survey Cycle
    const period = await prisma.surveyPeriod.upsert({
        where: { id: PERIOD_ID },
        update: { status: "OPEN" },
        create: {
            id: PERIOD_ID,
            name: "Week 40 Retail Survey Cycle 2026",
            startDate: new Date("2026-09-28T00:00:00Z"),
            endDate: new Date("2026-10-04T23:59:59Z"),
            status: "OPEN",
        },
    });

    // 2. Ensure Competitors Exist
    const compGarment = await prisma.competitor.upsert({
        where: { id: "comp-garment" },
        update: {},
        create: { id: "comp-garment", name: "Garment Market", type: "FRESH" },
    });

    const compFreshCorner = await prisma.competitor.upsert({
        where: { id: "comp-fresh-corner" },
        update: {},
        create: { id: "comp-fresh-corner", name: "Fresh Corner", type: "FRESH" },
    });

    const compStraight = await prisma.competitor.upsert({
        where: { id: "comp-straight" },
        update: {},
        create: { id: "comp-straight", name: "Straight Market", type: "FRESH" },
    });

    // 3. Ensure Stores Exist
    const storeGarment = await prisma.store.upsert({
        where: { id: "store-garment-01" },
        update: {},
        create: {
            id: "store-garment-01",
            competitorId: compGarment.id,
            name: "Garment Market - Wholesale Hub",
            area: "Garment",
            type: "FRESH",
            latitude: 8.9500000,
            longitude: 38.7400000,
        },
    });

    const storeFreshCorner = await prisma.store.upsert({
        where: { id: "store-fresh-corner-01" },
        update: {},
        create: {
            id: "store-fresh-corner-01",
            competitorId: compFreshCorner.id,
            name: "Fresh Corner - Central",
            area: "Bole",
            type: "FRESH",
            latitude: 9.0100000,
            longitude: 38.7800000,
        },
    });

    const storeStraight = await prisma.store.upsert({
        where: { id: "store-straight-01" },
        update: {},
        create: {
            id: "store-straight-01",
            competitorId: compStraight.id,
            name: "Straight Market - Source Gate",
            area: "Lamberet",
            type: "FRESH",
            latitude: 9.0300000,
            longitude: 38.8000000,
        },
    });

    // 4. Ensure Field Auditor & Manager Exist
    const auditor = await prisma.user.upsert({
        where: { email: "agent1@aires.et" },
        update: {},
        create: {
            name: "Dawit Haile",
            email: "agent1@aires.et",
            phone: "+251911223344",
            role: "FIELD_AUDITOR",
            active: true,
            locationPermission: "GRANTED",
        },
    });

    // 5. Seed Core Products & Benchmarks
    const testProducts = [
        { id: "PROD-GARLIC", name: "Garlic 1kg", category: "Fresh Produce", unit: "kg", sku: "207001-GL", queensPrice: 320.00 },
        { id: "PROD-MILK", name: "Lame Milk 500ml Bottle", category: "Dairy", unit: "500ml", sku: "2020026", queensPrice: 109.00 },
        { id: "PROD-YOGHURT", name: "Lame Yoghurt 500ml", category: "Dairy", unit: "500ml", sku: "2020016", queensPrice: 103.00 },
        { id: "PROD-EGGS", name: "Table Eggs", category: "Eggs", unit: "unit", sku: "2050001", queensPrice: 20.00 },
        { id: "PROD-POTATO", name: "Potato 1kg", category: "Fresh Produce", unit: "kg", sku: "207001", queensPrice: 60.00 },
        { id: "PROD-TOMATO", name: "Tomato 1kg", category: "Fresh Produce", unit: "kg", sku: "207001-TM", queensPrice: 45.00 },
    ];

    for (const p of testProducts) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: { name: p.name, category: p.category, unit: p.unit, sku: p.sku },
            create: { id: p.id, name: p.name, category: p.category, unit: p.unit, sku: p.sku },
        });

        await prisma.queensPrice.create({
            data: {
                productId: p.id,
                price: p.queensPrice,
                effectiveFrom: new Date("2026-09-28T00:00:00Z"),
                source: "Official Baseline Matrix",
            },
        });
    }

    // 6. Create Assignments and In-Progress Audits
    const assignment = await prisma.surveyAssignment.upsert({
        where: {
            auditorId_storeId_surveyPeriodId: {
                auditorId: auditor.id,
                storeId: storeGarment.id,
                surveyPeriodId: period.id,
            },
        },
        update: { status: "IN_PROGRESS" },
        create: {
            auditorId: auditor.id,
            storeId: storeGarment.id,
            surveyPeriodId: period.id,
            status: "IN_PROGRESS",
        },
    });

    const auditGarment = await prisma.audit.upsert({
        where: { id: "audit-garment-ai-test" },
        update: { status: "IN_PROGRESS" },
        create: {
            id: "audit-garment-ai-test",
            assignmentId: assignment.id,
            auditorId: auditor.id,
            storeId: storeGarment.id,
            surveyPeriodId: period.id,
            status: "IN_PROGRESS",
            startedAt: new Date(),
        },
    });

    const auditFresh = await prisma.audit.upsert({
        where: { id: "audit-fresh-ai-test" },
        update: { status: "IN_PROGRESS" },
        create: {
            id: "audit-fresh-ai-test",
            assignmentId: assignment.id,
            auditorId: auditor.id,
            storeId: storeFreshCorner.id,
            surveyPeriodId: period.id,
            status: "IN_PROGRESS",
            startedAt: new Date(),
        },
    });

    const auditStraight = await prisma.audit.upsert({
        where: { id: "audit-straight-ai-test" },
        update: { status: "IN_PROGRESS" },
        create: {
            id: "audit-straight-ai-test",
            assignmentId: assignment.id,
            auditorId: auditor.id,
            storeId: storeStraight.id,
            surveyPeriodId: period.id,
            status: "IN_PROGRESS",
            startedAt: new Date(),
        },
    });

    // 7. SEED OBSERVATIONS (Including the AI Anomaly Target)

    // A. Normal peer observations for Garlic
    await prisma.priceObservation.upsert({
        where: { clientObservationId: "obs_fresh_garlic" },
        update: {},
        create: {
            clientObservationId: "obs_fresh_garlic",
            auditId: auditFresh.id,
            productId: "PROD-GARLIC",
            auditorId: auditor.id,
            availability: "AVAILABLE",
            price: 377.00,
            capturedAt: new Date(),
            reviewStatus: "APPROVED",
            syncStatus: "SYNCED",
        },
    });

    // B. THE ANOMALY TARGET: Severe downward outlier (35.00 ETB instead of ~350 ETB)
    const anomalyObs = await prisma.priceObservation.upsert({
        where: { clientObservationId: "obs_garment_garlic_anomaly" },
        update: { price: 35.00, reviewStatus: "PENDING" },
        create: {
            clientObservationId: "obs_garment_garlic_anomaly",
            auditId: auditGarment.id,
            productId: "PROD-GARLIC",
            auditorId: auditor.id,
            availability: "AVAILABLE",
            price: 35.00,
            capturedAt: new Date(),
            reviewStatus: "PENDING",
            syncStatus: "SYNCED",
            notes: "Shed 4 produce quote",
        },
    });

    // C. Ex-Factory Sourcing Costs (Straight Market: Negative Margin Test Cases)
    await prisma.priceObservation.upsert({
        where: { clientObservationId: "obs_straight_milk" },
        update: {},
        create: {
            clientObservationId: "obs_straight_milk",
            auditId: auditStraight.id,
            productId: "PROD-MILK",
            auditorId: auditor.id,
            availability: "AVAILABLE",
            price: 134.00, // Factory cost floor is 134 vs Queens retail 109!
            capturedAt: new Date(),
            reviewStatus: "APPROVED",
            syncStatus: "SYNCED",
            notes: "Lame Dairy Lamberet Ex-Factory Proforma",
        },
    });

    await prisma.priceObservation.upsert({
        where: { clientObservationId: "obs_straight_yoghurt" },
        update: {},
        create: {
            clientObservationId: "obs_straight_yoghurt",
            auditId: auditStraight.id,
            productId: "PROD-YOGHURT",
            auditorId: auditor.id,
            availability: "AVAILABLE",
            price: 181.00, // Factory cost floor is 181 vs Queens retail 103!
            capturedAt: new Date(),
            reviewStatus: "APPROVED",
            syncStatus: "SYNCED",
        },
    });

    await prisma.priceObservation.upsert({
        where: { clientObservationId: "obs_straight_eggs" },
        update: {},
        create: {
            clientObservationId: "obs_straight_eggs",
            auditId: auditStraight.id,
            productId: "PROD-EGGS",
            auditorId: auditor.id,
            availability: "AVAILABLE",
            price: 23.50,
            capturedAt: new Date(),
            reviewStatus: "APPROVED",
            syncStatus: "SYNCED",
        },
    });

    console.log("✅ Seed completed successfully!");
    console.log(`\n🎯 AI Test Case ID for Anomaly Guardian:`);
    console.log(`👉 Open: http://localhost:5173/observations/${anomalyObs.id}`);
    console.log(`\n📊 Executive AI Report Test:`);
    console.log(`👉 Open: http://localhost:5173/price-analysis?surveyPeriodId=${PERIOD_ID}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });