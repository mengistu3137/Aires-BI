/**
 * Automated Smoke Test for Aires-BI Backend
 * Run via: node scripts/smoke/api-smoke.mjs (ensure backend is running first!)
 */
const BASE_URL = process.env.API_URL || "http://localhost:5000";

const testLog = (name, passed, detail = "") => {
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [Smoke Test] ${name} ${detail ? `— ${detail}` : ""}`);
};

async function runSmokeSuite() {
  console.log("\n🚀 Starting Aires-BI Enterprise Smoke Verification Suite...\n");
  let failed = false;

  // Pre-flight check: Test if backend is reachable
  try {
    await fetch(`${BASE_URL}/health`);
  } catch (err) {
    console.error(`❌ Could not connect to Aires-BI server at ${BASE_URL}`);
    console.error(`👉 The server is not running. Please start it in another terminal:\n`);
    console.error(`   cd Backend`);
    console.error(`   npm run dev\n`);
    process.exit(1);
  }

  try {
    // 1. Health Gateway Endpoint
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    const healthOk = healthRes.status === 200 && healthData.app === "Aires-BI";
    testLog("Health Check Gateway", healthOk, `Status: ${healthRes.status}`);
    if (!healthOk) failed = true;

    // 2. Field Auditor Login (Dawit Haile)
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "+251911223344",
        password: "Aires@2026",
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData?.data?.token;
    const authOk = loginRes.status === 200 && Boolean(token);
    testLog("Auditor Authentication", authOk, `User: ${loginData?.data?.user?.name || "N/A"}`);
    if (!authOk) failed = true;

    // 3. Manager Login (Tigist Alemu)
    const managerLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "+251922334455",
        password: "Aires@2026",
      }),
    });
    const managerData = await managerLoginRes.json();
    const managerToken = managerData?.data?.token;
    const managerOk = managerLoginRes.status === 200 && Boolean(managerToken);
    testLog("Manager Authentication", managerOk, `User: ${managerData?.data?.user?.name || "N/A"}`);
    if (!managerOk) failed = true;

    // 4. Submit Field Price Entry (Red Onion at Shoa)
    const submitRes = await fetch(`${BASE_URL}/api/v1/surveys/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        itemId: "Veg-01",
        competitorId: "shoa",
        marketName: "Shoa Supermarket",
        surveyPeriodId: "2026-W39",
        price: 61.5,
        unit: "kg",
        latitude: 9.032,
        longitude: 38.7469,
        accuracy: 7,
      }),
    });
    const submitData = await submitRes.json();
    const submitOk = submitRes.status === 201;
    testLog("Field Price & GPS Entry Submission", submitOk, `Entry ID: ${submitData?.data?.entry?.id || "N/A"}`);
    if (!submitOk) failed = true;

    // 5. BI Pricing Intelligence Calculation Query
    const biRes = await fetch(`${BASE_URL}/api/v1/bi/dashboard?periodId=2026-W39`, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });
    const biData = await biRes.json();
    const biOk = biRes.status === 200 && Boolean(biData?.data?.dashboardSummary);
    testLog(
      "BI Pricing Engine & Indexing",
      biOk,
      `Overall Index: ${biData?.data?.dashboardSummary?.overallPriceIndexPercent || "N/A"}%`
    );
    if (!biOk) failed = true;

    console.log("\n==========================================");
    if (failed) {
      console.log("❌ Some verifications failed. Review logs above.\n");
      process.exit(1);
    } else {
      console.log("🎉 ALL AIRES-BI SMOKE VERIFICATIONS PASSED!\n");
      process.exit(0);
    }
  } catch (error) {
    console.error("💥 Smoke Test encountered unexpected error:", error.message);
    process.exit(1);
  }
}

runSmokeSuite();