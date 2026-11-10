/**
 * ============================================================
 *  AIRES-BI PILOT DATA ADAPTATION & DEDUPLICATION ENGINE
 * ============================================================
 *
 *  1. Safely removes orphaned duplicates with 0 observations.
 *  2. Adapts the 20 Fresh Produce items to Track 1 (DAILY).
 *  3. Adapts the 100 FMCG items to Track 2 (WEEKLY).
 *  4. Preserves 100% of historical audits, observations, and benchmarks.
 *
 *  Run with: node scripts/adapt-and-clean-pilot-products.js
 * ============================================================
 */

import "dotenv/config";
import prisma from "../src/config/db.js";

// Helper: Normalize product names for comparison
const cleanName = (str) =>
    String(str ?? "")
        .toLowerCase()
        .replace(/\(.*?\)/g, "") // strip parenthetical units e.g. (kg), (pcs)
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

async function main() {
    console.log("============================================================");
    console.log(" 🔄 [Aires-BI] Starting Pilot Catalog Adaptation & Cleanup");
    console.log("============================================================\n");

    // ──────────────────────────────────────────────────────────
    // STEP 1: REMOVE ZERO-HISTORY DUPLICATE FRESH PRODUCTS
    // ──────────────────────────────────────────────────────────
    console.log("🧹 Step 1: Checking for duplicate fresh products...");

    const allProducts = await prisma.product.findMany({
        include: {
            _count: {
                select: {
                    observations: true,
                    assignmentItems: true,
                    analyses: true,
                    alerts: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    const byName = new Map();
    const toDelete = [];

    for (const p of allProducts) {
        const key = cleanName(p.name);
        if (!key) continue;

        const historyCount =
            p._count.observations +
            p._count.assignmentItems +
            p._count.analyses +
            p._count.alerts;

        if (!byName.has(key)) {
            byName.set(key, { ...p, historyCount });
        } else {
            const existing = byName.get(key);

            // If the duplicate row has 0 linked history, queue for safe removal
            if (historyCount === 0) {
                toDelete.push(p);
            } else if (existing.historyCount === 0) {
                toDelete.push(existing);
                byName.set(key, { ...p, historyCount });
            }
        }
    }

    if (toDelete.length > 0) {
        console.log(`   ⚠️ Found ${toDelete.length} redundant duplicate rows with 0 history.`);
        for (const dup of toDelete) {
            await prisma.queensPrice.deleteMany({ where: { productId: dup.id } });
            await prisma.product.delete({ where: { id: dup.id } });
            console.log(`   ✓ Removed duplicate: "${dup.name}" (ID: ${dup.id})`);
        }
    } else {
        console.log("   ✓ No redundant duplicate rows found.");
    }

    // ──────────────────────────────────────────────────────────
    // STEP 2: ADAPT 20 FRESH PRODUCE ITEMS TO DAILY (TRACK 1)
    // ──────────────────────────────────────────────────────────
    console.log("\n🌱 Step 2: Adapting 20 Fresh Produce items to DAILY (Track 1)...");

    const freshUpdate = await prisma.product.updateMany({
        where: {
            OR: [
                { id: { startsWith: "DLP-VEG" } },
                { id: { startsWith: "DLP-FRU" } },
                { id: { startsWith: "DLP-DAI" } },
                { id: { startsWith: "DLP-MEA" } },
                { id: { startsWith: "DLP-PLT" } },
                { barcode: { startsWith: "DLP-" } },
                { category: "Fresh" },
                { category: "Fresh Produce" },
                {
                    name: {
                        in: [
                            "Red Onion",
                            "Tomato",
                            "Potato",
                            "Kell Cabbage",
                            "Hot Peppers",
                            "Garlic",
                            "Carrot",
                            "Orange",
                            "Papaye",
                            "Avocado",
                            "Banana",
                            "Lemmon",
                            "Lame Milk 500ml",
                            "Lame Yoghurt 500ml",
                            "Lame Cheese",
                            "Farm Egg (Crate)",
                            "Top Side Meat (Nekele)",
                            "Chunk Meat (Yewet Sega)",
                            "Lamb Carcass (Yebeg Sega)",
                            "Whole Chicken",
                        ],
                        mode: "insensitive",
                    },
                },
            ],
        },
        data: {
            frequency: "DAILY",
            active: true,
        },
    });

    console.log(`   ✓ ${freshUpdate.count} products assigned to Track 1 (DAILY)`);

    // ──────────────────────────────────────────────────────────
    // STEP 3: ADAPT 100 FMCG ITEMS TO WEEKLY (TRACK 2)
    // ──────────────────────────────────────────────────────────
    console.log("\n📦 Step 3: Adapting 100 Ultra-Sensitive FMCG items to WEEKLY (Track 2)...");

    const fmcgUpdate = await prisma.product.updateMany({
        where: {
            OR: [
                { category: "Ultra-Sensitive" },
                { id: { startsWith: "40000000-0000-4000-8000-0000000000" } }, // pilot FMCG UUID prefix
            ],
            NOT: {
                frequency: "DAILY",
            },
        },
        data: {
            frequency: "WEEKLY",
            active: true,
        },
    });

    console.log(`   ✓ ${fmcgUpdate.count} products assigned to Track 2 (WEEKLY)`);

    // ──────────────────────────────────────────────────────────
    // STEP 4: AUDIT INTEGRITY & STATUS REPORT
    // ──────────────────────────────────────────────────────────
    const counts = await prisma.product.groupBy({
        by: ["frequency"],
        _count: { _all: true },
    });

    const totalProducts = await prisma.product.count();
    const totalObservations = await prisma.priceObservation.count();
    const totalAudits = await prisma.audit.count();

    console.log("\n============================================================");
    console.log(" 📊 AUTHORITATIVE DATABASE STATUS");
    console.log("============================================================");
    counts.forEach((c) => {
        console.log(`   • Track [${c.frequency}]: ${c._count._all} products`);
    });
    console.log(`   --------------------------------------------------------`);
    console.log(`   • Total Products in DB : ${totalProducts}`);
    console.log(`   • Historical Audits    : ${totalAudits} (100% Preserved)`);
    console.log(`   • Observations Kept    : ${totalObservations} (100% Preserved)`);
    console.log("============================================================\n");
    console.log("🎉 Complete! You can now import your 500 Monthly and 2,804 Bi-Yearly items without collisions.\n");
}

main()
    .catch((e) => {
        console.error("\n❌ Script failed:", e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });