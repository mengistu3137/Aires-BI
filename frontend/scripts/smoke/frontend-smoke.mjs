/**
 * Automated Frontend Smoke Test Runner for Aires-BI
 * Run via: node scripts/smoke/frontend-smoke.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

let failures = 0;

const log = (category, testName, passed, detail = "") => {
    const icon = passed ? "✅" : "❌";
    console.log(`${icon} [${category}] ${testName} ${detail ? `— ${detail}` : ""}`);
    if (!passed) failures++;
};

async function runFrontendSmokeSuite() {
    console.log("\n=======================================================");
    console.log("🚀 Aires-BI Frontend Client Verification Suite");
    console.log("=======================================================\n");

    // -----------------------------------------------------------------
    // 1. PWA & PUBLIC ASSETS INTEGRITY
    // -----------------------------------------------------------------
    console.log("--- 1. PWA Manifest & Brand Assets ---");

    // 1.1 Manifest
    const manifestPath = path.join(rootDir, "public/manifest.json");
    const manifestExists = fs.existsSync(manifestPath);
    let manifestValid = false;
    if (manifestExists) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
            manifestValid =
                manifest.theme_color?.toUpperCase() === "#A41821" &&
                manifest.display === "standalone" &&
                manifest.short_name === "Aires-BI";
        } catch {
            manifestValid = false;
        }
    }
    log("PWA", "Manifest Configuration", manifestExists && manifestValid, "Theme: #A41821 (Aires Red)");

    // 1.2 Logo SVG
    const logoPath = path.join(rootDir, "public/aires-logo.svg");
    const logoExists = fs.existsSync(logoPath);
    let logoHasBrandColors = false;
    if (logoExists) {
        const svgContent = fs.readFileSync(logoPath, "utf-8");
        logoHasBrandColors =
            svgContent.includes("#A41821") &&
            svgContent.includes("#017C4D") &&
            svgContent.includes("#FE7914");
    }
    log("BRAND", "Official 3D Ribbon Logo SVG", logoExists && logoHasBrandColors, "Red, Green & Orange");

    // -----------------------------------------------------------------
    // 2. PILOT DATA REPOSITORY
    // -----------------------------------------------------------------
    console.log("\n--- 2. Pilot Catalog Data Repository ---");

    const pilotDataModule = await import("../../src/data/pilotData.js");
    const {
        PILOT_USERS,
        PILOT_COMPETITORS,
        PILOT_STORES,
        PILOT_PRODUCTS,
        PILOT_PERIOD,
    } = pilotDataModule;

    // 2.1 Products
    const productsOk = Array.isArray(PILOT_PRODUCTS) && PILOT_PRODUCTS.length >= 20;
    const sampleProduct = PILOT_PRODUCTS?.[0];
    const productStructureOk =
        sampleProduct?.id &&
        sampleProduct?.name &&
        sampleProduct?.category &&
        sampleProduct?.unit &&
        sampleProduct?.queensPrice > 0;
    log("DATA", "20-Item Master Product Catalog", productsOk && productStructureOk, `Loaded: ${PILOT_PRODUCTS.length} items`);

    // 2.2 Physical Stores
    const storesOk = Array.isArray(PILOT_STORES) && PILOT_STORES.length >= 7;
    const sampleStore = PILOT_STORES?.[0];
    const storeGpsOk = sampleStore?.latitude && sampleStore?.longitude && sampleStore?.competitorId;
    log("DATA", "7 Physical Stores with GPS", storesOk && storeGpsOk, `First Store: ${sampleStore?.name}`);

    // 2.3 Users
    const usersOk = Array.isArray(PILOT_USERS) && PILOT_USERS.length >= 6;
    const hasAuditors = PILOT_USERS.some((u) => u.role === "FIELD_AUDITOR");
    const hasManagers = PILOT_USERS.some((u) => u.role === "MANAGER");
    const hasAdmins = PILOT_USERS.some((u) => u.role === "ADMIN");
    log("DATA", "Operational Users Matrix", usersOk && hasAuditors && hasManagers && hasAdmins, "1 Admin, 1 Manager, 4 Auditors");

    // 2.4 Period
    const periodOk = PILOT_PERIOD?.id === "2026-W39" && PILOT_PERIOD?.status === "OPEN";
    log("DATA", "Survey Cycle Configuration", periodOk, `Active Cycle: ${PILOT_PERIOD?.id}`);

    // -----------------------------------------------------------------
    // 3. CORE PRICING & CALCULATION ENGINE
    // -----------------------------------------------------------------
    console.log("\n--- 3. Pricing Action Engine & Calculations ---");

    const calcModule = await import("../../src/utils/calculations.js");
    const { calculatePriceAction, calculateAverage } = calcModule;

    // Average helper
    const avg = calculateAverage([60, 62, 58]);
    log("CALC", "Arithmetic Average", avg === 60, `Average of [60,62,58] = ${avg}`);

    // Rule 1: Queens Price > 1.05 * Competitor -> PRICE_DOWN
    // Queens = 64.00, Cheapest Competitor = 58.50 -> Index = 64 / 58.5 = 1.094 (109.4%)
    const actionDown = calculatePriceAction(64.0, 58.5);
    const actionDownOk = actionDown.action === "PRICE_DOWN" && actionDown.indexPercent === 109.4;
    log("CALC", "Rule: Index > 1.05 -> PRICE_DOWN", actionDownOk, `Queens 64.0 vs Comp 58.5 = ${actionDown.indexPercent}% (PRICE_DOWN)`);

    // Rule 2: Queens Price < 0.95 * Competitor -> PRICE_UP
    // Queens = 890.00, Competitor = 950.00 -> Index = 890 / 950 = 0.937 (93.7%)
    const actionUp = calculatePriceAction(890.0, 950.0);
    const actionUpOk = actionUp.action === "PRICE_UP" && actionUp.indexPercent === 93.7;
    log("CALC", "Rule: Index < 0.95 -> PRICE_UP", actionUpOk, `Queens 890.0 vs Comp 950.0 = ${actionUp.indexPercent}% (PRICE_UP)`);

    // Rule 3: 0.95 <= Index <= 1.05 -> KEEP
    // Queens = 110.00, Competitor = 110.00 -> Index = 1.000 (100.0%)
    const actionKeep = calculatePriceAction(110.0, 110.0);
    const actionKeepOk = actionKeep.action === "KEEP" && actionKeep.indexPercent === 100.0;
    log("CALC", "Rule: 0.95 - 1.05 -> KEEP", actionKeepOk, `Queens 110.0 vs Comp 110.0 = ${actionKeep.indexPercent}% (KEEP)`);

    // -----------------------------------------------------------------
    // 4. GPS HAVERSINE DISTANCE ENGINE
    // -----------------------------------------------------------------
    console.log("\n--- 4. GPS Geolocation & Distance Calculation ---");

    const distanceModule = await import("../../src/features/stores/utils/distance.js");
    const { calculateDistanceMeters, isWithinStoreRadius } = distanceModule;

    // Store at Allmart Bole: 8.9984120, 38.7865200
    // Auditor standing 25 meters away: 8.9985500, 38.7865200
    const distance = calculateDistanceMeters(8.998412, 38.78652, 8.99855, 38.78652);
    const distOk = distance !== null && distance > 10 && distance < 20;
    const isInside = isWithinStoreRadius(distance, 150);
    log("GPS", "Haversine Distance (Nearby)", distOk && isInside, `Calculated: ${distance}m (Within 150m: ${isInside})`);

    // Auditor standing 5 km away
    const farDistance = calculateDistanceMeters(8.998412, 38.78652, 9.03045, 38.7521);
    const isOutside = !isWithinStoreRadius(farDistance, 150);
    log("GPS", "Haversine Distance (Outside Perimeter)", isOutside, `Calculated: ${farDistance}m (Outside 150m: ${isOutside})`);

    // -----------------------------------------------------------------
    // 5. PERMISSIONS & RBAC MATRIX
    // -----------------------------------------------------------------
    console.log("\n--- 5. RBAC & Permissions Engine ---");

    const permModule = await import("../../src/permissions/permissions.js");
    const { hasPermission, PERMISSIONS } = permModule;

    const adminCanExport = hasPermission("ADMIN", PERMISSIONS.EXPORT_DATA);
    const managerCanAssign = hasPermission("MANAGER", PERMISSIONS.ASSIGN_SURVEYS);
    const auditorCanSubmit = hasPermission("FIELD_AUDITOR", PERMISSIONS.SUBMIT_SURVEY);
    const auditorCannotExport = !hasPermission("FIELD_AUDITOR", PERMISSIONS.EXPORT_DATA);
    const auditorCannotAssign = !hasPermission("FIELD_AUDITOR", PERMISSIONS.ASSIGN_SURVEYS);

    const rbacOk =
        adminCanExport &&
        managerCanAssign &&
        auditorCanSubmit &&
        auditorCannotExport &&
        auditorCannotAssign;

    log("RBAC", "Role Permissions Hierarchy", rbacOk, "Auditor restricted; Manager/Admin privileged");

    // -----------------------------------------------------------------
    // 6. COMPONENT FILE & ROUTE INTEGRITY
    // -----------------------------------------------------------------
    console.log("\n--- 6. Component & View Files Existence ---");

    const requiredComponents = [
        "src/components/Header.jsx",
        "src/components/Sidebar.jsx",
        "src/components/MainLayout.jsx",
        "src/components/DataTable.jsx",
        "src/components/Can.jsx",
        "src/components/PriceActionBadge.jsx",
        "src/components/StatusBadge.jsx",
        "src/components/ProgressBar.jsx",
        "src/features/auth/pages/LoginPage.jsx",
        "src/features/survey/pages/Survery.jsx",
        "src/features/survey/pages/SurveyProgress.jsx",
        "src/features/survey/components/SurveyAssignmentModal.jsx",
        "src/features/survey/components/PeriodManagementModal.jsx",
        "src/features/bi/pages/Dashboard.jsx",
        "src/features/products/pages/ProductsPage.jsx",
        "src/features/stores/pages/StoresPage.jsx",
        "src/features/users/pages/UsersPage.jsx",
        "src/app/router/index.jsx",
    ];

    let missingFiles = 0;
    for (const fileRel of requiredComponents) {
        const fullPath = path.join(rootDir, fileRel);
        if (!fs.existsSync(fullPath)) {
            log("FILES", fileRel, false, "MISSING on disk!");
            missingFiles++;
        }
    }

    if (missingFiles === 0) {
        log("FILES", "All 18 Critical UI Components & Pages", true, "Verified on disk");
    }

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log("\n=======================================================");
    if (failures === 0) {
        console.log("🎉 ALL FRONTEND VERIFICATION CHECKS PASSED!");
        console.log("=======================================================\n");
        process.exit(0);
    } else {
        console.log(`❌ Frontend verification completed with ${failures} failure(s).`);
        console.log("=======================================================\n");
        process.exit(1);
    }
}

runFrontendSmokeSuite().catch((err) => {
    console.error("💥 Fatal error during frontend smoke runner:", err);
    process.exit(1);
});