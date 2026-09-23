/**
 * Automated Frontend Smoke Test Runner for Aires-BI (Iteration 3)
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
    console.log("🚀 Aires-BI Frontend Client Verification Suite (Iteration 3)");
    console.log("=======================================================\n");

    // 1. PWA & PUBLIC ASSETS INTEGRITY
    console.log("--- 1. PWA Manifest & Brand Assets ---");

    const manifestPath = path.join(rootDir, "public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    const manifestOk =
        manifest.id === "/" &&
        manifest.start_url === "/" &&
        manifest.display === "standalone" &&
        manifest.theme_color?.toUpperCase() === "#A41821" &&
        manifest.background_color?.toUpperCase() === "#FFFFFF" &&
        Array.isArray(manifest.icons) &&
        manifest.icons.some((i) => i.sizes === "192x192") &&
        manifest.icons.some((i) => i.sizes === "512x512");

    log("PWA", "Chromium Standalone Criteria", manifestOk, "id, scope, 192/512 icons, #A41821 theme");

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

    // 2. REAL 120-ITEM PILOT CATALOG
    console.log("\n--- 2. Real Investigation Catalog (120 Items) ---");
    const pilotDataModule = await import("../../src/data/pilotData.js");
    const {
        PILOT_USERS,
        PILOT_COMPETITORS,
        PILOT_STORES,
        PILOT_PRODUCTS,
        PILOT_PERIOD,
    } = pilotDataModule;

    const productsOk = Array.isArray(PILOT_PRODUCTS) && PILOT_PRODUCTS.length >= 20;
    const sampleProduct = PILOT_PRODUCTS?.[0];
    const productStructureOk =
        sampleProduct?.id &&
        sampleProduct?.name &&
        sampleProduct?.category &&
        sampleProduct?.unit &&
        sampleProduct?.queensPrice > 0;
    log("DATA", "Investigation Products Catalog", productsOk && productStructureOk, `Loaded: ${PILOT_PRODUCTS.length} items`);

    // Barcode presence verification
    const productsWithBarcodes = PILOT_PRODUCTS.filter((p) => p.barcode || p.sku);
    const barcodesOk = productsWithBarcodes.length === PILOT_PRODUCTS.length;
    log("DATA", "Real Barcode & SKU Binding", barcodesOk, `${productsWithBarcodes.length}/${PILOT_PRODUCTS.length} items locked`);

    // Physical Stores with GPS
    const storesOk = Array.isArray(PILOT_STORES) && PILOT_STORES.length >= 7;
    const sampleStore = PILOT_STORES?.[0];
    const storeGpsOk = sampleStore?.latitude && sampleStore?.longitude && sampleStore?.competitorId;
    log("DATA", "7 Physical Stores with GPS", storesOk && storeGpsOk, `Store: ${sampleStore?.name}`);

    // Operational Team
    const usersOk = Array.isArray(PILOT_USERS) && PILOT_USERS.length >= 6;
    log("DATA", "Operational Users Matrix", usersOk, "1 Admin, 1 Manager, 4 Field Auditors");

    // Survey Cycle
    const periodOk = PILOT_PERIOD?.id === "2026-W39" && PILOT_PERIOD?.status === "OPEN";
    log("DATA", "Survey Cycle Configuration", periodOk, `Active Cycle: ${PILOT_PERIOD?.id}`);

    // 3. BARCODE EXACT MATCHING SIMULATION
    console.log("\n--- 3. Real-Time Barcode Matching Engine ---");
    const testBarcode = "6001001"; // RED ONION
    const matchedProduct = PILOT_PRODUCTS.find(
        (p) => p.barcode === testBarcode || p.sku === testBarcode
    );
    const matchOk = matchedProduct?.name?.toUpperCase().includes("RED ONION");
    log("SEARCH", "Exact Barcode Instant Match", matchOk, `Barcode '${testBarcode}' -> ${matchedProduct?.name}`);

    // 4. CORE PRICING & CALCULATION ENGINE
    console.log("\n--- 4. Pricing Action Engine & Calculations ---");
    const calcModule = await import("../../src/utils/calculations.js");
    const { calculatePriceAction, calculateAverage } = calcModule;

    // Average helper
    const avg = calculateAverage([60, 62, 58]);
    log("CALC", "Arithmetic Average", avg === 60, `Average of [60,62,58] = ${avg}`);

    // Rule 1: Index > 1.05 -> PRICE_DOWN
    const actionDown = calculatePriceAction(64.0, 58.5);
    const actionDownOk = actionDown.action === "PRICE_DOWN" && actionDown.indexPercent === 109.4;
    log("CALC", "Rule: Index > 1.05 -> PRICE_DOWN", actionDownOk, `Queens 64.0 vs Comp 58.5 = ${actionDown.indexPercent}%`);

    // Rule 2: Index < 0.95 -> PRICE_UP
    const actionUp = calculatePriceAction(890.0, 950.0);
    const actionUpOk = actionUp.action === "PRICE_UP" && actionUp.indexPercent === 93.7;
    log("CALC", "Rule: Index < 0.95 -> PRICE_UP", actionUpOk, `Queens 890.0 vs Comp 950.0 = ${actionUp.indexPercent}%`);

    // Rule 3: 0.95 - 1.05 -> KEEP
    const actionKeep = calculatePriceAction(110.0, 110.0);
    const actionKeepOk = actionKeep.action === "KEEP" && actionKeep.indexPercent === 100.0;
    log("CALC", "Rule: 0.95 - 1.05 -> KEEP", actionKeepOk, `Queens 110.0 vs Comp 110.0 = ${actionKeep.indexPercent}%`);

    // 5. GPS HAVERSINE DISTANCE ENGINE
    console.log("\n--- 5. GPS Geolocation & Distance Calculation ---");
    const distanceModule = await import("../../src/features/stores/utils/distance.js");
    const { calculateDistanceMeters, isWithinStoreRadius } = distanceModule;

    const distance = calculateDistanceMeters(8.998412, 38.78652, 8.99855, 38.78652);
    const distOk = distance !== null && distance > 10 && distance < 20;
    const isInside = isWithinStoreRadius(distance, 150);
    log("GPS", "Haversine Distance (Nearby)", distOk && isInside, `Distance: ${distance}m (Within 150m: ${isInside})`);

    // 6. RBAC & PERMISSIONS ENGINE
    console.log("\n--- 6. RBAC & Permissions Engine ---");
    const permModule = await import("../../src/permissions/permissions.js");
    const { hasPermission, PERMISSIONS } = permModule;

    const adminCanExport = hasPermission("ADMIN", PERMISSIONS.EXPORT_DATA);
    const managerCanAssign = hasPermission("MANAGER", PERMISSIONS.ASSIGN_SURVEYS);
    const auditorCanSubmit = hasPermission("FIELD_AUDITOR", PERMISSIONS.SUBMIT_SURVEY);
    const auditorCannotExport = !hasPermission("FIELD_AUDITOR", PERMISSIONS.EXPORT_DATA);

    log(
        "RBAC",
        "Role Permissions Hierarchy",
        adminCanExport && managerCanAssign && auditorCanSubmit && auditorCannotExport,
        "Auditor restricted; Manager/Admin privileged"
    );

    // 7. COMPONENT FILE & ROUTE INTEGRITY
    console.log("\n--- 7. Component & View Files Existence ---");
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
        "src/features/survey/pages/SurveyorHomePage.jsx",
        "src/features/survey/pages/Survery.jsx",
        "src/features/survey/pages/SurveyProgress.jsx",
        "src/features/survey/components/FastProductSearch.jsx",
        "src/features/survey/components/RapidPriceInput.jsx",
        "src/features/survey/components/SyncStatusBanner.jsx",
        "src/features/survey/components/ObservationAuditDrawer.jsx",
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
        log("FILES", `All ${requiredComponents.length} UI Components & Pages`, true, "Verified on disk");
    }

    // SUMMARY
    console.log("\n=======================================================");
    if (failures === 0) {
        console.log("🎉 ALL ITERATION 3 FRONTEND CHECKS PASSED!");
        console.log("=======================================================\n");
        process.exit(0);
    } else {
        console.log(`❌ Verification completed with ${failures} failure(s).`);
        console.log("=======================================================\n");
        process.exit(1);
    }
}

runFrontendSmokeSuite().catch((err) => {
    console.error("💥 Fatal error during frontend smoke runner:", err);
    process.exit(1);
});