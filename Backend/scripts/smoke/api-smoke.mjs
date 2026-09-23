/**
 * Iteration 2 Smoke Test Suite
 * Validates the 7 scoped modules:
 * 1. /auth
 * 2. /users
 * 3. /products
 * 4. /competitors
 * 5. /stores
 * 6. /survey-periods
 * 7. /assignments
 *
 * Run with: node scripts/smoke/scope-smoke.mjs
 */

const BASE_URL = process.env.API_URL || "http://localhost:5000";

let adminToken = null;
let auditorToken = null;
let testUserId = null;
let testStoreId = null;
let testAssignmentId = null;

const log = (moduleName, testName, passed, detail = "") => {
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${moduleName}] ${testName} ${detail ? `— ${detail}` : ""}`);
};

async function req(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runScopeSmokeSuite() {
  console.log("\n=======================================================");
  console.log("🚀 Aires-BI Iteration 2 Scoped Verification Suite");
  console.log("=======================================================\n");

  let failures = 0;

  // 0. HEALTH GATEWAY
  const health = await req("/health");
  const healthOk = health.status === 200 && health.data?.app === "Aires-BI";
  log("GATEWAY", "Health Check", healthOk, `Status: ${health.status}`);
  if (!healthOk) failures++;

  // 1. AUTH MODULE
  console.log("\n--- Testing 1. /auth ---");
  // Admin Login
  const adminLogin = await req("/api/v1/auth/login", "POST", {
    identifier: "+251911000001", // Abraham Tefera (Admin)
    password: "Aires@2026",
  });
  adminToken = adminLogin.data?.data?.token;
  const adminLoginOk = adminLogin.status === 200 && Boolean(adminToken);
  log("AUTH", "POST /login (Admin)", adminLoginOk, adminLogin.data?.data?.user?.name);
  if (!adminLoginOk) failures++;

  // Auditor Login
  const auditorLogin = await req("/api/v1/auth/login", "POST", {
    identifier: "+251911223344", // Dawit Haile (Agent 1)
    password: "Aires@2026",
  });
  auditorToken = auditorLogin.data?.data?.token;
  const auditorLoginOk = auditorLogin.status === 200 && Boolean(auditorToken);
  log("AUTH", "POST /login (Auditor)", auditorLoginOk, auditorLogin.data?.data?.user?.name);
  if (!auditorLoginOk) failures++;

  // GET /me
  const getMe = await req("/api/v1/auth/me", "GET", null, adminToken);
  const getMeOk = getMe.status === 200 && getMe.data?.data?.user?.role === "ADMIN";
  log("AUTH", "GET /me", getMeOk, `Role: ${getMe.data?.data?.user?.role}`);
  if (!getMeOk) failures++;

  // POST /logout
  const logoutRes = await req("/api/v1/auth/logout", "POST", null, adminToken);
  const logoutOk = logoutRes.status === 200;
  log("AUTH", "POST /logout", logoutOk, logoutRes.data?.message);
  if (!logoutOk) failures++;

  // 2. USERS MODULE
  console.log("\n--- Testing 2. /users ---");
  // GET /users
  const listUsers = await req("/api/v1/users", "GET", null, adminToken);
  const listUsersOk = listUsers.status === 200 && Array.isArray(listUsers.data?.data?.users);
  log("USERS", "GET /", listUsersOk, `Count: ${listUsers.data?.data?.users?.length}`);
  if (!listUsersOk) failures++;

  // POST /users
  const tempPhone = `+251999${Math.floor(100000 + Math.random() * 900000)}`;
  const createUser = await req("/api/v1/users", "POST", {
    name: "Temporary Auditor Test",
    phone: tempPhone,
    email: `temp_${Date.now()}@aires.et`,
    password: "TempPassword@123",
    role: "FIELD_AUDITOR",
  }, adminToken);
  testUserId = createUser.data?.data?.user?.id;
  const createUserOk = createUser.status === 201 && Boolean(testUserId);
  log("USERS", "POST /", createUserOk, `Created ID: ${testUserId}`);
  if (!createUserOk) failures++;

  // PATCH /users/:id
  if (testUserId) {
    const updateUser = await req(`/api/v1/users/${testUserId}`, "PATCH", {
      name: "Updated Auditor Name",
    }, adminToken);
    const updateUserOk = updateUser.status === 200 && updateUser.data?.data?.user?.name === "Updated Auditor Name";
    log("USERS", "PATCH /:id", updateUserOk);
    if (!updateUserOk) failures++;

    // DELETE /users/:id
    const deleteUser = await req(`/api/v1/users/${testUserId}`, "DELETE", null, adminToken);
    const deleteUserOk = deleteUser.status === 200;
    log("USERS", "DELETE /:id", deleteUserOk, deleteUser.data?.data?.message);
    if (!deleteUserOk) failures++;
  }

  // 3. PRODUCTS MODULE
  console.log("\n--- Testing 3. /products ---");
  const listProducts = await req("/api/v1/products", "GET", null, auditorToken);
  const listProductsOk = listProducts.status === 200 && listProducts.data?.results >= 20;
  log("PRODUCTS", "GET /", listProductsOk, `Catalog items: ${listProducts.data?.results}`);
  if (!listProductsOk) failures++;

  const getProduct = await req("/api/v1/products/VEG-01", "GET", null, auditorToken);
  const getProductOk = getProduct.status === 200 && getProduct.data?.data?.product?.currentQueensPrice > 0;
  log("PRODUCTS", "GET /:id", getProductOk, `Active price: ${getProduct.data?.data?.product?.currentQueensPrice} ETB`);
  if (!getProductOk) failures++;

  // 4. COMPETITORS MODULE
  console.log("\n--- Testing 4. /competitors ---");
  const listCompetitors = await req("/api/v1/competitors", "GET", null, adminToken);
  const listCompetitorsOk = listCompetitors.status === 200 && listCompetitors.data?.results >= 7;
  log("COMPETITORS", "GET /", listCompetitorsOk, `Competitors count: ${listCompetitors.data?.results}`);
  if (!listCompetitorsOk) failures++;

  // 5. STORES MODULE
  console.log("\n--- Testing 5. /stores ---");
  const listStores = await req("/api/v1/stores", "GET", null, auditorToken);
  const listStoresOk = listStores.status === 200 && listStores.data?.results >= 7;
  testStoreId = listStores.data?.data?.stores?.[0]?.id;
  log("STORES", "GET /", listStoresOk, `Stores count: ${listStores.data?.results}`);
  if (!listStoresOk) failures++;

  // 6. SURVEY PERIODS MODULE
  console.log("\n--- Testing 6. /survey-periods ---");
  const activePeriod = await req("/api/v1/survey-periods/active", "GET", null, auditorToken);
  const activePeriodOk = activePeriod.status === 200 && activePeriod.data?.data?.period?.id === "2026-W39";
  log("PERIODS", "GET /active", activePeriodOk, `Active ID: ${activePeriod.data?.data?.period?.id}`);
  if (!activePeriodOk) failures++;

  // 7. ASSIGNMENTS MODULE
  console.log("\n--- Testing 7. /assignments ---");
  // GET /assignments/mine (Auditor)
  const myAssignments = await req("/api/v1/assignments/mine", "GET", null, auditorToken);
  const myAssignmentsOk = myAssignments.status === 200 && Array.isArray(myAssignments.data?.data?.assignments);
  log("ASSIGNMENTS", "GET /mine (Auditor)", myAssignmentsOk, `Auditor assignments: ${myAssignments.data?.results}`);
  if (!myAssignmentsOk) failures++;

  // GET /assignments (Manager/Admin)
  const allAssignments = await req("/api/v1/assignments", "GET", null, adminToken);
  const allAssignmentsOk = allAssignments.status === 200 && allAssignments.data?.results >= 4;
  testAssignmentId = allAssignments.data?.data?.assignments?.[0]?.id;
  log("ASSIGNMENTS", "GET / (Manager/Admin)", allAssignmentsOk, `Total: ${allAssignments.data?.results}`);
  if (!allAssignmentsOk) failures++;

  // PATCH /assignments/:id
  if (testAssignmentId) {
    const updateAssignment = await req(`/api/v1/assignments/${testAssignmentId}`, "PATCH", {
      status: "IN_PROGRESS",
    }, adminToken);
    const updateAssignmentOk = updateAssignment.status === 200 && updateAssignment.data?.data?.assignment?.status === "IN_PROGRESS";
    log("ASSIGNMENTS", "PATCH /:id", updateAssignmentOk, `Status: ${updateAssignment.data?.data?.assignment?.status}`);
    if (!updateAssignmentOk) failures++;
  }

  console.log("\n=======================================================");
  if (failures === 0) {
    console.log("🎉 ALL 7 SCOPED MODULES PASSED VERIFICATION!");
    console.log("=======================================================\n");
    process.exit(0);
  } else {
    console.log(`❌ Verification completed with ${failures} failure(s).`);
    console.log("=======================================================\n");
    process.exit(1);
  }
}

runScopeSmokeSuite().catch((err) => {
  console.error("Fatal error during smoke suite:", err);
  process.exit(1);
});