import "dotenv/config";
import prisma from "../src/config/db.js";

const cleanName = (str) =>
    String(str ?? "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

async function dedupeAndAlign() {
    console.log("🧹 [Aires-BI] Deduplicating and aligning pilot vs imported products...\n");

    // 1. Fetch all products with their observation/assignment counts
    const allProducts = await prisma.product.findMany({
        include: {
            _count: {
                select: {
                    observations: true,
                    assignmentItems: true,
                    queensPrices: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    const byName = new Map();

    for (const p of allProducts) {
        const key = cleanName(p.name);
        if (!byName.has(key)) {
            byName.set(key, []);
        }
        byName.get(key).push(p);
    }

    let mergedCount = 0;

    for (const [name, prods] of byName.entries()) {
        if (prods.length > 1) {
            // Find the keeper: prefer the one that has real observations/assignments
            const keeper = prods.reduce((prev, curr) => {
                const prevHistory = prev._count.observations + prev._count.assignmentItems;
                const currHistory = curr._count.observations + curr._count.assignmentItems;
                return currHistory > prevHistory ? curr : prev;
            });

            const duplicates = prods.filter((p) => p.id !== keeper.id);

            for (const dup of duplicates) {
                // If duplicate has no observations, safe to remove
                if (dup._count.observations === 0 && dup._count.assignmentItems === 0) {
                    // If keeper lacks barcode but duplicate has real barcode, transfer it
                    if ((!keeper.barcode || keeper.barcode.startsWith("DLP-")) && dup.barcode && !dup.barcode.startsWith("DLP-")) {
                        await prisma.product.update({
                            where: { id: keeper.id },
                            data: { barcode: dup.barcode, sku: dup.sku || dup.barcode },
                        });
                    }

                    // Delete duplicate's QueensPrice rows first
                    await prisma.queensPrice.deleteMany({ where: { productId: dup.id } });
                    await prisma.product.delete({ where: { id: dup.id } });
                    mergedCount += 1;
                }
            }
        }
    }

    console.log(`✅ Cleaned ${mergedCount} redundant duplicate rows.`);

    // 2. Strict frequency assignment for the canonical 120 pilot items
    const freshItems = [
        "red onion", "tomato", "potato", "kell cabbage", "hot peppers",
        "garlic", "carrot", "orange", "papaye", "avocado", "banana",
        "lemmon", "lame milk 500ml", "lame yoghurt 500ml", "lame cheese",
        "farm egg crate", "top side meat nekele", "chunk meat yewet sega",
        "lamb carcass yebeg sega", "whole chicken"
    ];

    for (const fName of freshItems) {
        await prisma.product.updateMany({
            where: {
                OR: [
                    { name: { contains: fName, mode: "insensitive" } },
                    { id: { startsWith: "DLP-" } },
                    { barcode: { startsWith: "DLP-" } },
                ],
            },
            data: { frequency: "DAILY" },
        });
    }

    // 3. Print verified counts
    const breakdown = await prisma.product.groupBy({
        by: ["frequency"],
        _count: { _all: true },
    });

    console.log("\n📊 Current Database Breakdown:");
    breakdown.forEach((b) => {
        console.log(`   • ${b.frequency}: ${b._count._all} products`);
    });
    console.log("\n✨ Database is now deduplicated and ready.\n");
}

dedupeAndAlign()
    .catch((e) => {
        console.error("❌ Failed:", e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });