/**
 * ============================================================
 *  AIRES-BI PRODUCTION SUPER ADMIN PROVISIONER
 * ============================================================
 *  NON-DESTRUCTIVE: Safe to run on live production databases.
 *  Provisions or promotes the 2 dedicated Super Admins:
 *    1. Abraham Shiferaw
 *    2. Seife
 *
 *  Run with: node scripts/seed-superadmin.js
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

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Aires@2026";

const SUPER_ADMINS = [
    {
        name: "Abraham Shiferaw",
        email: "abraham.admin@aires.et",
        phone: "+251910009094",
        searchTerms: ["abraham.admin@aires.et", "abraham@aires.et", "+251910009094", "Abraham"],
    },
    {
        name: "Seife",
        email: "seife.admin@aires.et",
        phone: "+251911000001",
        searchTerms: ["seife.admin@aires.et", "seife@aires.et", "+251911000001", "Seife"],
    },
];

async function ensureEnumSupportsSuperAdmin() {
    try {
        await prisma.$executeRawUnsafe(
            `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';`
        );
    } catch {
        // Value already exists or transaction already active
    }
}

async function main() {
    console.log("============================================================");
    console.log(" 👑 [Aires-BI] Provisioning 2 Dedicated Super Admins");
    console.log("============================================================\n");

    // 1. Ensure PostgreSQL Role enum has 'SUPER_ADMIN'
    await ensureEnumSupportsSuperAdmin();

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const provisioned = [];

    for (const target of SUPER_ADMINS) {
        // Find existing account by email, phone, or name match
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { in: target.searchTerms, mode: "insensitive" } },
                    { phone: { in: target.searchTerms } },
                    { name: { contains: target.searchTerms[target.searchTerms.length - 1], mode: "insensitive" } },
                ],
            },
        });

        let userRecord;

        if (existing) {
            // Elevate existing account without touching their audits, history, or relations
            userRecord = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    role: "SUPER_ADMIN",
                    active: true,
                    passwordHash, // Reset to authoritative password
                },
            });
            console.log(`✅ Elevated existing user [${userRecord.name}] → SUPER_ADMIN`);
        } else {
            // Create new Super Admin account if not found
            userRecord = await prisma.user.create({
                data: {
                    name: target.name,
                    email: target.email,
                    phone: target.phone,
                    role: "SUPER_ADMIN",
                    active: true,
                    passwordHash,
                },
            });
            console.log(`✅ Created new user [${userRecord.name}] → SUPER_ADMIN`);
        }

        provisioned.push(userRecord);
    }

    console.log("\n============================================================");
    console.log(" AUTHORITATIVE AIRES SUPER ADMINS");
    console.log("============================================================");
    provisioned.forEach((u, idx) => {
        console.log(` ${idx + 1}. ${u.name}`);
        console.log(`    Email   : ${u.email}`);
        console.log(`    Phone   : ${u.phone}`);
        console.log(`    Role    : ${u.role}`);
        console.log(`    Password: ${DEFAULT_PASSWORD}`);
        console.log("    --------------------------------------------------------");
    });
    console.log(" Both users now hold permanent Aires Super Admin privileges.");
    console.log("============================================================\n");
}

main()
    .catch((e) => {
        console.error("\n❌ Provisioning failed:", e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });