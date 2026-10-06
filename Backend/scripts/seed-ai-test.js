// Backend/scripts/seed-ai-test.js
import "dotenv/config";
import prisma from "../src/config/db.js";

async function main() {
    console.log("🌱 Seeding Aires-BI Full-Stack AI & Multi-Range Test Scenario...");

    const now = new Date();
    // 1. Anchor survey period dynamically so today and the past 5 days are inside
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);   // 7 days ahead

    const PERIOD_ID = "2026-W40";

    const period = await prisma.surveyPeriod.upsert({
        where: { id: PERIOD_ID },
        update: {
            name: "Week 40 Retail Survey Cycle 2026",
            startDate: periodStart,
            endDate: periodEnd,
            status: "OPEN",
        },
        create: {
            id: PERIOD_ID,
            name: "Week 40 Retail Survey Cycle 2026",
            startDate: periodStart,
            endDate: periodEnd,
            status: "OPEN",
        },
    });

    // 2. Ensure Competitors for BOTH Streams
    const competitorsData = [
        // Fresh Produce Competitors (aliases in report.config.js)
        { id: "comp-garment", name: "Garment Market", type: "FRESH" },
        { id: "comp-fresh-corner", name: "Fresh Corner", type: "FRESH" },
        { id: "comp-straight", name: "Straight Market", type: "FRESH" },

        // Ultra-Sensitive FMCG Competitors (aliases in report.config.js)
        { id: "comp-shoa", name: "Shoa Supermarket", type: "FMCG" },
        { id: "comp-abadir", name: "Abadir Supermarket", type: "FMCG" },
        { id: "comp-allmart", name: "Allmart Supermarket", type: "FMCG" },
        { id: "comp-bambis", name: "Bambis Supermarket", type: "FMCG" },
    ];

    for (const c of competitorsData) {
        await prisma.competitor.upsert({
            where: { id: c.id },
            update: { name: c.name, type: c.type },
            create: c,
        });
    }

    // 3. Ensure Physical Stores
    const storesData = [
        { id: "store-garment-01", competitorId: "comp-garment", name: "Garment Market - Wholesale Shed", area: "Garment", type: "FRESH" },
        { id: "store-fresh-corner-01", competitorId: "comp-fresh-corner", name: "Fresh Corner - Bole Branch", area: "Bole", type: "FRESH" },
        { id: "store-straight-01", competitorId: "comp-straight", name: "Straight Market - Lamberet Gate", area: "Lamberet", type: "FRESH" },
        { id: "store-shoa-01", competitorId: "comp-shoa", name: "Shoa Supermarket - Sarbet", area: "Sarbet", type: "FMCG" },
        { id: "store-abadir-01", competitorId: "comp-abadir", name: "Abadir Supermarket - Merkato", area: "Merkato", type: "FMCG" },
        { id: "store-allmart-01", competitorId: "comp-allmart", name: "Allmart - Kazanchis", area: "Kazanchis", type: "FMCG" },
        { id: "store-bambis-01", competitorId: "comp-bambis", name: "Bambis Supermarket - Kirkos", area: "Kirkos", type: "FMCG" },
    ];

    const storeMap = {};
    for (const s of storesData) {
        const store = await prisma.store.upsert({
            where: { id: s.id },
            update: { name: s.name, area: s.area, type: s.type, competitorId: s.competitorId },
            create: {
                id: s.id,
                competitorId: s.competitorId,
                name: s.name,
                area: s.area,
                type: s.type,
                latitude: 9.0100000,
                longitude: 38.7600000,
            },
        });
        storeMap[s.id] = store;
    }

    // 4. Ensure Field Auditor
    const auditor = await prisma.user.upsert({
        where: { email: "agent1@aires.et" },
        update: { active: true },
        create: {
            name: "Dawit Haile",
            email: "agent1@aires.et",
            phone: "+251911223344",
            role: "FIELD_AUDITOR",
            active: true,
            locationPermission: "GRANTED",
        },
    });

    // 5. Seed Core Products & Benchmarks for BOTH streams
    const productsData = [
        // Stream A: Fresh Corner (Non Ultra-Sensitive)
        { id: "PROD-GARLIC", name: "Garlic Local 1kg", category: "Fresh Produce", unit: "kg", sku: "FP-GAR-01", queensPrice: 320.00 },
        { id: "PROD-TOMATO", name: "Fresh Tomato 1kg", category: "Fresh Produce", unit: "kg", sku: "FP-TOM-01", queensPrice: 55.00 },
        { id: "PROD-POTATO", name: "Shashemene Potato 1kg", category: "Fresh Produce", unit: "kg", sku: "FP-POT-01", queensPrice: 65.00 },
        { id: "PROD-MILK", name: "Lame Pasteurized Milk 500ml", category: "Dairy", unit: "500ml", sku: "DY-MLK-01", queensPrice: 109.00 },
        { id: "PROD-EGGS", name: "Table Eggs Large (30 pcs)", category: "Eggs", unit: "tray", sku: "EG-TRY-01", queensPrice: 590.00 },

        // Stream B: Ultra-Sensitive FMCG (category matches 'Ultra-Sensitive' exactly)
        { id: "PROD-OIL-5L", name: "Sunflower Cooking Oil 5L", category: "Ultra-Sensitive", unit: "5L", sku: "US-OIL-05", queensPrice: 1250.00 },
        { id: "PROD-SUGAR-1K", name: "White Refined Sugar 1kg", category: "Ultra-Sensitive", unit: "kg", sku: "US-SUG-01", queensPrice: 140.00 },
        { id: "PROD-PASTA", name: "Bini Macaroni Pasta 500g", category: "Ultra-Sensitive", unit: "500g", sku: "US-PAS-01", queensPrice: 75.00 },
        { id: "PROD-MILK-POWDER", name: "Dano Full Cream Milk Powder 900g", category: "Ultra-Sensitive", unit: "900g", sku: "US-DNM-09", queensPrice: 1890.00 },
        { id: "PROD-RICE-5K", name: "Basmati Rice Grade 1 5kg", category: "Ultra-Sensitive", unit: "5kg", sku: "US-RIC-05", queensPrice: 980.00 },
    ];

    for (const p of productsData) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: { name: p.name, category: p.category, unit: p.unit, sku: p.sku },
            create: { id: p.id, name: p.name, category: p.category, unit: p.unit, sku: p.sku },
        });

        await prisma.queensPrice.deleteMany({ where: { productId: p.id } });
        await prisma.queensPrice.create({
            data: {
                productId: p.id,
                price: p.queensPrice,
                effectiveFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                source: "Official Baseline Matrix",
            },
        });
    }

    // 6. Distinct Survey Assignments, Items, and Audits per Store
    const audits = {};
    for (const store of Object.values(storeMap)) {
        const assignment = await prisma.surveyAssignment.upsert({
            where: {
                auditorId_storeId_surveyPeriodId: {
                    auditorId: auditor.id,
                    storeId: store.id,
                    surveyPeriodId: period.id,
                },
            },
            update: { status: "COMPLETED" },
            create: {
                auditorId: auditor.id,
                storeId: store.id,
                surveyPeriodId: period.id,
                status: "COMPLETED",
            },
        });

        // Seed Assignment Items for this store
        const relevantProducts = productsData.filter((p) =>
            store.type === "FRESH"
                ? p.category !== "Ultra-Sensitive"
                : p.category === "Ultra-Sensitive",
        );

        for (const prod of relevantProducts) {
            await prisma.assignmentItem.upsert({
                where: {
                    assignmentId_productId: {
                        assignmentId: assignment.id,
                        productId: prod.id,
                    },
                },
                update: { required: true },
                create: {
                    assignmentId: assignment.id,
                    productId: prod.id,
                    required: true,
                },
            });
        }

        const audit = await prisma.audit.upsert({
            where: { id: `audit-${store.id}-${period.id}` },
            update: { status: "COMPLETED" },
            create: {
                id: `audit-${store.id}-${period.id}`,
                assignmentId: assignment.id,
                auditorId: auditor.id,
                storeId: store.id,
                surveyPeriodId: period.id,
                status: "COMPLETED",
                startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                completedAt: now,
            },
        });

        audits[store.id] = audit;
    }

    // 7. Seed Observations with valid capturedAt inside the period
    const obsTimestamp = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago (inside period & week)

    const observationsToSeed = [
        // ── Fresh Corner Stream ──
        {
            clientObservationId: "obs_garment_garlic",
            storeId: "store-garment-01",
            productId: "PROD-GARLIC",
            price: 295.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_fresh_corner_garlic",
            storeId: "store-fresh-corner-01",
            productId: "PROD-GARLIC",
            price: 360.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_straight_milk",
            storeId: "store-straight-01",
            productId: "PROD-MILK",
            price: 135.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
            notes: "Cost floor alert: Ex-factory price exceeds Queen's retail price",
        },
        {
            clientObservationId: "obs_garment_tomato",
            storeId: "store-garment-01",
            productId: "PROD-TOMATO",
            price: 48.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_fresh_corner_tomato",
            storeId: "store-fresh-corner-01",
            productId: "PROD-TOMATO",
            price: 68.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_garment_potato_oos",
            storeId: "store-garment-01",
            productId: "PROD-POTATO",
            price: null,
            availability: "OUT_OF_STOCK",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
            notes: "Morning shift wholesale shortage",
        },
        {
            clientObservationId: "obs_fresh_corner_eggs",
            storeId: "store-fresh-corner-01",
            productId: "PROD-EGGS",
            price: 610.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },

        // ── Ultra-Sensitive FMCG Stream ──
        {
            clientObservationId: "obs_shoa_oil",
            storeId: "store-shoa-01",
            productId: "PROD-OIL-5L",
            price: 1320.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_allmart_oil",
            storeId: "store-allmart-01",
            productId: "PROD-OIL-5L",
            price: 1300.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_abadir_oil",
            storeId: "store-abadir-01",
            productId: "PROD-OIL-5L",
            price: 1280.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_bambis_oil",
            storeId: "store-bambis-01",
            productId: "PROD-OIL-5L",
            price: 1390.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_shoa_sugar",
            storeId: "store-shoa-01",
            productId: "PROD-SUGAR-1K",
            price: 155.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_allmart_sugar",
            storeId: "store-allmart-01",
            productId: "PROD-SUGAR-1K",
            price: 150.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_shoa_pasta",
            storeId: "store-shoa-01",
            productId: "PROD-PASTA",
            price: 82.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_abadir_pasta",
            storeId: "store-abadir-01",
            productId: "PROD-PASTA",
            price: 78.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_shoa_dano",
            storeId: "store-shoa-01",
            productId: "PROD-MILK-POWDER",
            price: 1950.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_bambis_dano",
            storeId: "store-bambis-01",
            productId: "PROD-MILK-POWDER",
            price: 2050.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
        {
            clientObservationId: "obs_allmart_rice",
            storeId: "store-allmart-01",
            productId: "PROD-RICE-5K",
            price: 1040.00,
            availability: "AVAILABLE",
            capturedAt: obsTimestamp,
            reviewStatus: "APPROVED",
        },
    ];

    for (const obs of observationsToSeed) {
        await prisma.priceObservation.upsert({
            where: { clientObservationId: obs.clientObservationId },
            update: {
                price: obs.price,
                availability: obs.availability,
                capturedAt: obs.capturedAt,
                reviewStatus: obs.reviewStatus,
            },
            create: {
                clientObservationId: obs.clientObservationId,
                auditId: audits[obs.storeId].id,
                productId: obs.productId,
                auditorId: auditor.id,
                availability: obs.availability,
                price: obs.price,
                capturedAt: obs.capturedAt,
                reviewStatus: obs.reviewStatus,
                syncStatus: "SYNCED",
                notes: obs.notes || null,
            },
        });
    }

    console.log("✅ Seed completed successfully!");
    console.log("\n========================================================");
    console.log("🚀 READY FOR END-TO-END VERIFICATION:");
    console.log("========================================================");
    console.log(`1. Cycle PDF Download: /api/v1/reports/pdf?surveyPeriodId=${PERIOD_ID}`);
    console.log(`2. Cycle Excel Download: /api/v1/reports/excel?surveyPeriodId=${PERIOD_ID}`);
    console.log("3. Past 7 Days AI Brief: /api/v1/reports/ai-summary?rangeType=WEEK&reportType=ALL");
    console.log("4. Past 30 Days AI Brief: /api/v1/reports/ai-summary?rangeType=MONTH&reportType=ALL");
    console.log(`5. Frontend View: http://localhost:5173/price-analysis?surveyPeriodId=${PERIOD_ID}`);
    console.log("========================================================\n");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });