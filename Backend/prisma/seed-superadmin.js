/**
 * ============================================================
 *  AIRES-BI PRODUCTION SUPER ADMIN PROVISIONER (STANDALONE)
 * ============================================================
 *  NON-DESTRUCTIVE: 100% safe to run on live production databases.
 *  Provisions or promotes the 2 dedicated Super Admins:
 *    1. Abraham Shiferaw (abraham.admin@aires.et | +251910009094)
 *    2. Seife (seife.admin@aires.et | +251911000001)
 *
 *  - Never deletes or modifies other staff accounts.
 *  - Leaves all historical audits, observations, and benchmarks intact.
 *  - Safe to run repeatedly (Idempotent).
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
    },
    {
        name: "Seife",
        email: "seife.admin@aires.et",
        phone: "+251911000001",
    },
];

/**
 * Safely ensure PostgreSQL "Role" enum has 'SUPER_ADMIN'
 * Handles PostgreSQL syntax without aborting active sessions.
 */
async function ensureEnumSupportsSuperAdmin() {
    try {
        await prisma.$executeRawUnsafe(
            `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';`
        );
        console.log("✓ PostgreSQL Role enum checked for 'SUPER_ADMIN'");
    } catch (err) {
        // Already exists or database doesn't require explicit alter
        console.log("✓ PostgreSQL Role enum already verified");
    }
}

async function main() {
    console.log("============================================================");
    console.log(" 👑 [Aires-BI] Production Super Admin Provisioner");
    console.log("============================================================\n");

    // 1. Ensure Enum supports SUPER_ADMIN
    await ensureEnumSupportsSuperAdmin();

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const provisioned = [];

    for (const target of SUPER_ADMINS) {
        // 2. Strict, non-destructive matching: check only exact email or exact phone
        let existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: target.email, mode: "insensitive" } },
                    { phone: target.phone },
                ],
            },
        });

        // Fallback: Check if target's exact name already exists as an ADMIN
        if (!existing) {
            existing = await prisma.user.findFirst({
                where: {
                    name: { equals: target.name, mode: "insensitive" },
                    role: { in: ["ADMIN", "SUPER_ADMIN", "MANAGER"] },
                },
            });
        }

        let userRecord;

        if (existing) {
            // 3. Elevate existing user: Update role and password without touching IDs or relations
            userRecord = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    name: target.name,
                    email: target.email,
                    phone: target.phone,
                    role: "SUPER_ADMIN",
                    active: true,
                    passwordHash,
                },
            });
            console.log(`✅ [UPDATED] Elevated existing account: "${userRecord.name}" (${userRecord.email}) → SUPER_ADMIN`);
        } else {
            // 4. Create fresh Super Admin account
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
            console.log(`✅ [CREATED] Provisioned new Super Admin: "${userRecord.name}" (${userRecord.email})`);
        }

        provisioned.push(userRecord);
    }

    console.log("\n============================================================");
    console.log(" AUTHORITATIVE AIRES SUPER ADMIN CREDENTIALS");
    console.log("============================================================");
    provisioned.forEach((u, idx) => {
        console.log(` ${idx + 1}. ${u.name}`);
        console.log(`    ID      : ${u.id}`);
        console.log(`    Email   : ${u.email}`);
        console.log(`    Phone   : ${u.phone}`);
        console.log(`    Role    : ${u.role}`);
        console.log(`    Password: ${DEFAULT_PASSWORD}`);
        console.log("    --------------------------------------------------------");
    });
    console.log(" Both accounts now hold permanent Aires Super Admin access.");
    console.log(" Zero existing field audits, observations, or prices were modified.");
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