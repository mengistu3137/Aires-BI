import "dotenv/config";
import prisma from "../src/config/db.js";

const formatProductName = (name) => {
    if (!name || typeof name !== "string") return "";

    const minorWords = new Set([
        "with",
        "and",
        "or",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "by",
    ]);

    return name
        .toLowerCase()
        .replace(/\b([a-z0-9/()*-]+)\b/gi, (match, offset) => {
            const lower = match.toLowerCase();

            const unitMatch = match.match(/^(\d+(?:\/\d+)?)(gm|g|kg|ml|l|ltr|pcs|pack|gr)$/i);
            if (unitMatch) {
                const u = unitMatch[2].toLowerCase();
                const normUnit =
                    u === "gm" || u === "gr"
                        ? "g"
                        : u === "ltr" || u === "litre" || u === "liter"
                            ? "L"
                            : u;
                return `${unitMatch[1]}${normUnit}`;
            }

            if (offset > 0 && minorWords.has(lower)) {
                return lower;
            }

            return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        })
        .replace(/\s+/g, " ")
        .trim();
};

async function fixCasingAndOrder() {
    console.log("🛠️ [Aires-BI] Converting all product names to Title Case and resetting sortOrder per track...\n");

    const frequencies = ["DAILY", "WEEKLY", "MONTHLY", "BI_YEARLY"];

    for (const freq of frequencies) {
        const products = await prisma.product.findMany({
            where: { frequency: freq },
            orderBy: { createdAt: "asc" },
        });

        console.log(`Setting track sequence for [${freq}]: ${products.length} products (1 to ${products.length})...`);

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            await prisma.product.update({
                where: { id: p.id },
                data: {
                    name: formatProductName(p.name),
                    sortOrder: i + 1, // Resets per-track: 1 to 20, 1 to 100, 1 to 500, 1 to 2804+
                },
            });
        }
    }

    console.log("\n✅ Finished! All tracks now have their own independent 1..N sortOrder and Title Cased names.");
}

fixCasingAndOrder()
    .catch(console.error)
    .finally(() => prisma.$disconnect());