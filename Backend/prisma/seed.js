/**
 * ============================================================
 *  DEVELOPMENT / TESTING DATABASE SEEDER
 * ============================================================
 *
 *  This seed is idempotent and safe to re-run:
 *    - Deterministic IDs are used everywhere.
 *    - `upsert` is used for every insert.
 *    - No TRUNCATE, no unbounded deleteMany.
 *
 *  It seeds the full workflow:
 *    Users → Products → Competitors → Stores → SurveyPeriods
 *      → Assignments → AssignmentItems → Audits → QueensPrices
 *      → PriceObservations → PriceAnalyses → Alerts
 *
 *  ⚠️  DEVELOPMENT PASSWORDS (all users):
 *        Password123!
 *
 *  Run with:  npx prisma db seed
 *        or:  npm run db:seed
 * ============================================================
 */
import "dotenv/config";

import prisma from "../src/config/db.js";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

// ============================================================
// SHARED CONFIG
// ============================================================

const DEV_PASSWORD = "Password123!";
const BCRYPT_ROUNDS = 10;

// ------------------------------------------------------------
// 🔌 PASSWORD HASHING — reuse your project's existing function.
//
// If your project uses bcryptjs  → this file already works.
// If your project uses bcrypt    → change the import to `bcrypt`
//                                   (default export works the same way).
// If your project uses argon2    → replace hashPassword with:
//     import argon2 from 'argon2';
//     const hashPassword = (pw) => argon2.hash(pw);
// If your project has its own utility, import THAT instead.
// ------------------------------------------------------------
const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// ============================================================
// DETERMINISTIC IDs
// Using UUIDs so they remain stable across re-runs and are easy
// to reference in Postman / Insomnia.
// ============================================================

const ID = {
  users: {
    admin: "11111111-1111-4111-8111-111111111111",
    manager1: "11111111-1111-4111-8111-111111111112",
    manager2: "11111111-1111-4111-8111-111111111113",
    auditor1: "11111111-1111-4111-8111-111111111114",
    auditor2: "11111111-1111-4111-8111-111111111115",
    auditor3: "11111111-1111-4111-8111-111111111116",
  },
  products: {
    wheatFlour: "22222222-2222-4222-8222-222222222201",
    teff: "22222222-2222-4222-8222-222222222202",
    rice: "22222222-2222-4222-8222-222222222203",
    sugar: "22222222-2222-4222-8222-222222222204",
    oil: "22222222-2222-4222-8222-222222222205",
    pasta: "22222222-2222-4222-8222-222222222206",
    macaroni: "22222222-2222-4222-8222-222222222207",
    bread: "22222222-2222-4222-8222-222222222208",
    milk: "22222222-2222-4222-8222-222222222209",
    eggs: "22222222-2222-4222-8222-222222222210",
    tomato: "22222222-2222-4222-8222-222222222211",
    onion: "22222222-2222-4222-8222-222222222212",
    potato: "22222222-2222-4222-8222-222222222213",
    banana: "22222222-2222-4222-8222-222222222214",
    apple: "22222222-2222-4222-8222-222222222215",
    coffee: "22222222-2222-4222-8222-222222222216",
    lentils: "22222222-2222-4222-8222-222222222217",
    chickpeas: "22222222-2222-4222-8222-222222222218",
    soap: "22222222-2222-4222-8222-222222222219",
    detergent: "22222222-2222-4222-8222-222222222220",
    // intentionally inactive to test filtering
    biscuit: "22222222-2222-4222-8222-222222222221",
  },
  competitors: {
    compA: "comp-aaaa-0001",
    compB: "comp-bbbb-0002",
    compC: "comp-cccc-0003",
    compD: "comp-dddd-0004",
    freshMkt: "comp-eeee-0005",
    wholesale: "comp-ffff-0006",
  },
  stores: {
    s1: "33333333-3333-4333-8333-333333333301",
    s2: "33333333-3333-4333-8333-333333333302",
    s3: "33333333-3333-4333-8333-333333333303",
    s4: "33333333-3333-4333-8333-333333333304",
    s5: "33333333-3333-4333-8333-333333333305",
    s6: "33333333-3333-4333-8333-333333333306",
    s7: "33333333-3333-4333-8333-333333333307",
    s8: "33333333-3333-4333-8333-333333333308",
    s9: "33333333-3333-4333-8333-333333333309",
    s10: "33333333-3333-4333-8333-333333333310",
    s11: "33333333-3333-4333-8333-333333333311",
    s12: "33333333-3333-4333-8333-333333333312",
  },
  periods: {
    past: "period-0001-closed",
    current: "period-0002-open",
    future: "period-0003-draft",
  },
  assignments: {
    a1_notStarted: "aaaaaaaa-0001-4001-8001-000000000001",
    a1_inProgress: "aaaaaaaa-0002-4002-8002-000000000002",
    a1_completed: "aaaaaaaa-0003-4003-8003-000000000003",
    a2_notStarted: "aaaaaaaa-0004-4004-8004-000000000004",
    a2_completed: "aaaaaaaa-0005-4005-8005-000000000005",
    a3_cancelled: "aaaaaaaa-0006-4006-8006-000000000006",
  },
  audits: {
    notStarted: "bbbbbbbb-0001-4001-8001-000000000001",
    inProgress: "bbbbbbbb-0002-4002-8002-000000000002",
    completed1: "bbbbbbbb-0003-4003-8003-000000000003",
    completed2: "bbbbbbbb-0004-4004-8004-000000000004",
    needsReview: "bbbbbbbb-0005-4005-8005-000000000005",
    cancelled: "bbbbbbbb-0006-4006-8006-000000000006",
  },
};

// ============================================================
// HELPERS
// ============================================================

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n) => new Date(Date.now() + n * 86_400_000);
const day = (iso) => new Date(`${iso}T08:00:00.000Z`);

// ============================================================
// 1. USERS
// ============================================================

async function seedUsers() {
  const hash = await hashPassword(DEV_PASSWORD);

  const users = [
    {
      id: ID.users.admin,
      name: "Admin User",
      email: "admin@priceaudit.test",
      phone: "+251900000001",
      role: "ADMIN",
    },
    {
      id: ID.users.manager1,
      name: "Manager One",
      email: "manager1@priceaudit.test",
      phone: "+251900000002",
      role: "MANAGER",
    },
    {
      id: ID.users.manager2,
      name: "Manager Two",
      email: "manager2@priceaudit.test",
      phone: "+251900000003",
      role: "MANAGER",
    },
    {
      id: ID.users.auditor1,
      name: "Field Auditor 1",
      email: "auditor1@priceaudit.test",
      phone: "+251900000004",
      role: "FIELD_AUDITOR",
    },
    {
      id: ID.users.auditor2,
      name: "Field Auditor 2",
      email: "auditor2@priceaudit.test",
      phone: "+251900000005",
      role: "FIELD_AUDITOR",
    },
    {
      id: ID.users.auditor3,
      name: "Field Auditor 3",
      email: "auditor3@priceaudit.test",
      phone: "+251900000006",
      role: "FIELD_AUDITOR",
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        passwordHash: hash,
        active: true,
      },
      create: { ...u, passwordHash: hash, active: true },
    });
  }
  return users.length;
}

// ============================================================
// 2. PRODUCTS
// ============================================================

async function seedProducts() {
  const products = [
    {
      id: ID.products.wheatFlour,
      name: "Wheat Flour",
      description: "All-purpose white wheat flour",
      sku: "WF-001",
      barcode: "1000000000001",
      category: "Grains & Cereals",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.teff,
      name: "Teff",
      description: "Premium Ethiopian teff grain",
      sku: "TF-002",
      barcode: "1000000000002",
      category: "Grains & Cereals",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.rice,
      name: "Rice",
      description: "Long-grain white rice",
      sku: "RC-003",
      barcode: "1000000000003",
      category: "Grains & Cereals",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.sugar,
      name: "Sugar",
      description: "Refined white sugar",
      sku: "SG-004",
      barcode: "1000000000004",
      category: "Pantry",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.oil,
      name: "Cooking Oil",
      description: "Refined sunflower cooking oil",
      sku: "CO-005",
      barcode: "1000000000005",
      category: "Pantry",
      unit: "liter",
      active: true,
    },
    {
      id: ID.products.pasta,
      name: "Pasta",
      description: "Durum wheat spaghetti",
      sku: "PS-006",
      barcode: "1000000000006",
      category: "Pantry",
      unit: "pack",
      active: true,
    },
    {
      id: ID.products.macaroni,
      name: "Macaroni",
      description: "Elbow macaroni pasta",
      sku: "MC-007",
      barcode: "1000000000007",
      category: "Pantry",
      unit: "pack",
      active: true,
    },
    {
      id: ID.products.bread,
      name: "Bread",
      description: "Fresh white bread loaf",
      sku: "BR-008",
      barcode: "1000000000008",
      category: "Bakery",
      unit: "piece",
      active: true,
    },
    {
      id: ID.products.milk,
      name: "Milk",
      description: "Full-cream UHT milk",
      sku: "MK-009",
      barcode: "1000000000009",
      category: "Dairy",
      unit: "liter",
      active: true,
    },
    {
      id: ID.products.eggs,
      name: "Eggs",
      description: "Farm fresh chicken eggs",
      sku: "EG-010",
      barcode: "1000000000010",
      category: "Dairy",
      unit: "dozen",
      active: true,
    },
    {
      id: ID.products.tomato,
      name: "Tomato",
      description: "Fresh red tomatoes",
      sku: "TM-011",
      barcode: "1000000000011",
      category: "Fresh Produce",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.onion,
      name: "Onion",
      description: "Red onions",
      sku: "ON-012",
      barcode: "1000000000012",
      category: "Fresh Produce",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.potato,
      name: "Potato",
      description: "Fresh potatoes",
      sku: "PT-013",
      barcode: "1000000000013",
      category: "Fresh Produce",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.banana,
      name: "Banana",
      description: "Ripe bananas",
      sku: "BN-014",
      barcode: "1000000000014",
      category: "Fresh Produce",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.apple,
      name: "Apple",
      description: "Red apples",
      sku: "AP-015",
      barcode: "1000000000015",
      category: "Fresh Produce",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.coffee,
      name: "Coffee",
      description: "Roasted Ethiopian coffee beans",
      sku: "CF-016",
      barcode: "1000000000016",
      category: "Beverages",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.lentils,
      name: "Lentils",
      description: "Red split lentils",
      sku: "LN-017",
      barcode: "1000000000017",
      category: "Grains & Cereals",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.chickpeas,
      name: "Chickpeas",
      description: "Dried chickpeas",
      sku: "CP-018",
      barcode: "1000000000018",
      category: "Grains & Cereals",
      unit: "kg",
      active: true,
    },
    {
      id: ID.products.soap,
      name: "Soap",
      description: "Bath soap bar",
      sku: "SP-019",
      barcode: "1000000000019",
      category: "Household",
      unit: "piece",
      active: true,
    },
    {
      id: ID.products.detergent,
      name: "Detergent",
      description: "Laundry detergent powder",
      sku: "DT-020",
      barcode: "1000000000020",
      category: "Household",
      unit: "kg",
      active: true,
    },
    // Inactive — for testing inactive filtering
    {
      id: ID.products.biscuit,
      name: "Biscuit (Discontinued)",
      description: "Discontinued biscuit line",
      sku: "BS-021",
      barcode: "1000000000021",
      category: "Snacks",
      unit: "pack",
      active: false,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  return products.length;
}

// ============================================================
// 3. COMPETITORS
// ============================================================

async function seedCompetitors() {
  const competitors = [
    {
      id: ID.competitors.compA,
      name: "Competitor A Supermarket",
      type: "FMCG",
      active: true,
    },
    {
      id: ID.competitors.compB,
      name: "Competitor B Retail",
      type: "FMCG",
      active: true,
    },
    {
      id: ID.competitors.compC,
      name: "Competitor C Fresh",
      type: "FRESH",
      active: true,
    },
    {
      id: ID.competitors.compD,
      name: "Competitor D Hypermarket",
      type: "BOTH",
      active: true,
    },
    {
      id: ID.competitors.freshMkt,
      name: "Local Fresh Market",
      type: "FRESH",
      active: true,
    },
    {
      id: ID.competitors.wholesale,
      name: "Wholesale Market Co.",
      type: "BOTH",
      active: false,
    },
  ];

  for (const c of competitors) {
    await prisma.competitor.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  return competitors.length;
}

// ============================================================
// 4. STORES  (realistic Addis Ababa coordinates)
// ============================================================

async function seedStores() {
  const stores = [
    {
      id: ID.stores.s1,
      competitorId: ID.competitors.compA,
      name: "Comp A – Bole",
      address: "Bole Road, near Edna Mall",
      city: "Addis Ababa",
      area: "Bole",
      type: "FMCG",
      active: true,
      latitude: 8.9936,
      longitude: 38.7868,
    },
    {
      id: ID.stores.s2,
      competitorId: ID.competitors.compA,
      name: "Comp A – Piassa",
      address: "Piassa, near St. George",
      city: "Addis Ababa",
      area: "Piassa",
      type: "FMCG",
      active: true,
      latitude: 9.0356,
      longitude: 38.7507,
    },
    {
      id: ID.stores.s3,
      competitorId: ID.competitors.compB,
      name: "Comp B – Merkato",
      address: "Merkato main road",
      city: "Addis Ababa",
      area: "Merkato",
      type: "FMCG",
      active: true,
      latitude: 9.0341,
      longitude: 38.7408,
    },
    {
      id: ID.stores.s4,
      competitorId: ID.competitors.compB,
      name: "Comp B – Saris",
      address: "Saris Addis, off Debre Zeit",
      city: "Addis Ababa",
      area: "Saris",
      type: "FMCG",
      active: true,
      latitude: 8.9678,
      longitude: 38.7698,
    },
    {
      id: ID.stores.s5,
      competitorId: ID.competitors.compC,
      name: "Comp C Fresh – Bole",
      address: "Bole Medhanialem",
      city: "Addis Ababa",
      area: "Bole",
      type: "FRESH",
      active: true,
      latitude: 9.0089,
      longitude: 38.7836,
    },
    {
      id: ID.stores.s6,
      competitorId: ID.competitors.compC,
      name: "Comp C Fresh – Kazanchis",
      address: "Kazanchis, near UNECA",
      city: "Addis Ababa",
      area: "Kazanchis",
      type: "FRESH",
      active: true,
      latitude: 9.0155,
      longitude: 38.7691,
    },
    {
      id: ID.stores.s7,
      competitorId: ID.competitors.compD,
      name: "Comp D – Megenagna",
      address: "Megenagna roundabout",
      city: "Addis Ababa",
      area: "Megenagna",
      type: "BOTH",
      active: true,
      latitude: 9.0226,
      longitude: 38.8023,
    },
    {
      id: ID.stores.s8,
      competitorId: ID.competitors.compD,
      name: "Comp D – Mexico",
      address: "Mexico Square",
      city: "Addis Ababa",
      area: "Mexico",
      type: "BOTH",
      active: true,
      latitude: 9.0105,
      longitude: 38.7449,
    },
    {
      id: ID.stores.s9,
      competitorId: ID.competitors.freshMkt,
      name: "Fresh Mkt – Bole",
      address: "Bole Atlas",
      city: "Addis Ababa",
      area: "Bole",
      type: "FRESH",
      active: true,
      latitude: 9.0019,
      longitude: 38.7893,
    },
    {
      id: ID.stores.s10,
      competitorId: ID.competitors.freshMkt,
      name: "Fresh Mkt – Piassa",
      address: "Piassa market square",
      city: "Addis Ababa",
      area: "Piassa",
      type: "FRESH",
      active: true,
      latitude: 9.0368,
      longitude: 38.7516,
    },
    {
      id: ID.stores.s11,
      competitorId: ID.competitors.wholesale,
      name: "Wholesale – Merkato",
      address: "Merkato wholesale hub",
      city: "Addis Ababa",
      area: "Merkato",
      type: "BOTH",
      active: false,
      latitude: 9.0332,
      longitude: 38.7419,
    },
    {
      id: ID.stores.s12,
      competitorId: ID.competitors.compA,
      name: "Comp A – Saris",
      address: "Saris, near ring road",
      city: "Addis Ababa",
      area: "Saris",
      type: "FMCG",
      active: true,
      latitude: 8.9702,
      longitude: 38.7712,
    },
  ];

  for (const s of stores) {
    await prisma.store.upsert({ where: { id: s.id }, update: s, create: s });
  }
  return stores.length;
}

// ============================================================
// 5. SURVEY PERIODS
// ============================================================

async function seedSurveyPeriods() {
  const periods = [
    {
      id: ID.periods.past,
      name: "Q3 2024 Price Survey",
      startDate: day("2024-09-01"),
      endDate: day("2024-09-30"),
      status: "CLOSED",
    },
    {
      id: ID.periods.current,
      name: "Q4 2024 Price Survey",
      startDate: day("2024-10-01"),
      endDate: day("2024-12-31"),
      status: "OPEN",
    },
    {
      id: ID.periods.future,
      name: "Q1 2025 Planning Survey",
      startDate: day("2025-01-01"),
      endDate: day("2025-03-31"),
      status: "DRAFT",
    },
  ];

  for (const p of periods) {
    await prisma.surveyPeriod.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  return periods.length;
}

// ============================================================
// 6. SURVEY ASSIGNMENTS
// ============================================================

async function seedAssignments() {
  const assignments = [
    // Auditor 1 — assigned to current OPEN period at three different stores
    {
      id: ID.assignments.a1_notStarted,
      auditorId: ID.users.auditor1,
      storeId: ID.stores.s1,
      surveyPeriodId: ID.periods.current,
      status: "NOT_STARTED",
      assignedAt: daysAgo(3),
      startedAt: null,
      completedAt: null,
    },
    {
      id: ID.assignments.a1_inProgress,
      auditorId: ID.users.auditor1,
      storeId: ID.stores.s2,
      surveyPeriodId: ID.periods.current,
      status: "IN_PROGRESS",
      assignedAt: daysAgo(5),
      startedAt: daysAgo(1),
      completedAt: null,
    },
    {
      id: ID.assignments.a1_completed,
      auditorId: ID.users.auditor1,
      storeId: ID.stores.s3,
      surveyPeriodId: ID.periods.current,
      status: "COMPLETED",
      assignedAt: daysAgo(12),
      startedAt: daysAgo(10),
      completedAt: daysAgo(9),
    },

    // Auditor 2
    {
      id: ID.assignments.a2_notStarted,
      auditorId: ID.users.auditor2,
      storeId: ID.stores.s4,
      surveyPeriodId: ID.periods.current,
      status: "NOT_STARTED",
      assignedAt: daysAgo(2),
      startedAt: null,
      completedAt: null,
    },
    {
      id: ID.assignments.a2_completed,
      auditorId: ID.users.auditor2,
      storeId: ID.stores.s5,
      surveyPeriodId: ID.periods.current,
      status: "COMPLETED",
      assignedAt: daysAgo(15),
      startedAt: daysAgo(13),
      completedAt: daysAgo(12),
    },

    // Auditor 3 — cancelled
    {
      id: ID.assignments.a3_cancelled,
      auditorId: ID.users.auditor3,
      storeId: ID.stores.s6,
      surveyPeriodId: ID.periods.current,
      status: "CANCELLED",
      assignedAt: daysAgo(8),
      startedAt: null,
      completedAt: null,
    },
  ];

  for (const a of assignments) {
    await prisma.surveyAssignment.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }
  return assignments.length;
}

// ============================================================
// 7. ASSIGNMENT ITEMS
// Products assigned to each assignment. Observations must
// reference a product that is present here for that assignment.
// ============================================================

// Product IDs grouped for convenience
const CORE_PRODUCTS = [
  ID.products.wheatFlour,
  ID.products.teff,
  ID.products.rice,
  ID.products.sugar,
  ID.products.oil,
  ID.products.pasta,
  ID.products.macaroni,
  ID.products.bread,
  ID.products.milk,
  ID.products.eggs,
];
const FRESH_PRODUCTS = [
  ID.products.tomato,
  ID.products.onion,
  ID.products.potato,
  ID.products.banana,
  ID.products.apple,
  ID.products.lentils,
  ID.products.chickpeas,
];

async function seedAssignmentItems() {
  const plan = {
    [ID.assignments.a1_notStarted]: CORE_PRODUCTS.slice(0, 8),
    [ID.assignments.a1_inProgress]: CORE_PRODUCTS.slice(0, 6).concat(
      FRESH_PRODUCTS.slice(0, 2),
    ),
    [ID.assignments.a1_completed]: CORE_PRODUCTS.slice(0, 4).concat(
      FRESH_PRODUCTS.slice(0, 4),
    ),
    [ID.assignments.a2_notStarted]: CORE_PRODUCTS.slice(0, 5),
    [ID.assignments.a2_completed]: CORE_PRODUCTS.slice(0, 3).concat(
      FRESH_PRODUCTS.slice(0, 5),
    ),
    [ID.assignments.a3_cancelled]: CORE_PRODUCTS.slice(0, 3),
  };

  let count = 0;
  for (const [assignmentId, productIds] of Object.entries(plan)) {
    for (const productId of productIds) {
      await prisma.assignmentItem.upsert({
        where: { assignmentId_productId: { assignmentId, productId } },
        update: { required: true },
        create: { assignmentId, productId, required: true },
      });
      count++;
    }
    // Add one optional product to a couple of assignments
    if (assignmentId === ID.assignments.a1_inProgress) {
      await prisma.assignmentItem.upsert({
        where: {
          assignmentId_productId: {
            assignmentId,
            productId: ID.products.coffee,
          },
        },
        update: { required: false },
        create: {
          assignmentId,
          productId: ID.products.coffee,
          required: false,
        },
      });
      count++;
    }
    if (assignmentId === ID.assignments.a1_completed) {
      await prisma.assignmentItem.upsert({
        where: {
          assignmentId_productId: { assignmentId, productId: ID.products.soap },
        },
        update: { required: false },
        create: { assignmentId, productId: ID.products.soap, required: false },
      });
      count++;
    }
  }
  return count;
}

// ============================================================
// 8. AUDITS  (one per assignment, matching status)
// ============================================================

async function seedAudits() {
  // Helper to fetch assignment to derive auditor/store/period
  const asg = async (id) =>
    prisma.surveyAssignment.findUnique({ where: { id } });

  const rows = [];

  // -- NOT_STARTED (assignment a1_notStarted)
  {
    const a = await asg(ID.assignments.a1_notStarted);
    rows.push({
      id: ID.audits.notStarted,
      assignmentId: a.id,
      auditorId: a.auditorId,
      storeId: a.storeId,
      surveyPeriodId: a.surveyPeriodId,
      status: "NOT_STARTED",
      startedAt: null,
      completedAt: null,
      notes: "Scheduled visit, not yet started.",
    });
  }

  // -- IN_PROGRESS (assignment a1_inProgress)
  {
    const a = await asg(ID.assignments.a1_inProgress);
    rows.push({
      id: ID.audits.inProgress,
      assignmentId: a.id,
      auditorId: a.auditorId,
      storeId: a.storeId,
      surveyPeriodId: a.surveyPeriodId,
      status: "IN_PROGRESS",
      startedAt: daysAgo(1),
      completedAt: null,
      startLatitude: 9.0356,
      startLongitude: 38.751,
      startAccuracyMeters: 4.5,
      distanceFromStoreMeters: 22.4,
      gpsValid: true,
      notes: "Started on-site at Piassa branch.",
    });
  }

  // -- COMPLETED #1 (assignment a1_completed)
  {
    const a = await asg(ID.assignments.a1_completed);
    rows.push({
      id: ID.audits.completed1,
      assignmentId: a.id,
      auditorId: a.auditorId,
      storeId: a.storeId,
      surveyPeriodId: a.surveyPeriodId,
      status: "COMPLETED",
      startedAt: daysAgo(10),
      completedAt: daysAgo(9),
      startLatitude: 9.034,
      startLongitude: 38.7407,
      startAccuracyMeters: 5.1,
      endLatitude: 9.0342,
      endLongitude: 38.7409,
      endAccuracyMeters: 4.2,
      distanceFromStoreMeters: 18.7,
      gpsValid: true,
      notes: "Completed Merkato visit.",
    });
  }

  // -- COMPLETED #2 (assignment a2_completed)
  {
    const a = await asg(ID.assignments.a2_completed);
    rows.push({
      id: ID.audits.completed2,
      assignmentId: a.id,
      auditorId: a.auditorId,
      storeId: a.storeId,
      surveyPeriodId: a.surveyPeriodId,
      status: "COMPLETED",
      startedAt: daysAgo(13),
      completedAt: daysAgo(12),
      startLatitude: 9.0089,
      startLongitude: 38.7836,
      startAccuracyMeters: 3.8,
      endLatitude: 9.0091,
      endLongitude: 38.7838,
      endAccuracyMeters: 3.5,
      distanceFromStoreMeters: 12.3,
      gpsValid: true,
      notes: "Completed Bole fresh market visit.",
    });
  }

  // -- NEEDS_REVIEW (attached to a1_completed so we have a second audit on the same assignment)
  {
    const a = await asg(ID.assignments.a1_completed);
    rows.push({
      id: ID.audits.needsReview,
      assignmentId: a.id,
      auditorId: a.auditorId,
      storeId: a.storeId,
      surveyPeriodId: a.surveyPeriodId,
      status: "NEEDS_REVIEW",
      startedAt: daysAgo(8),
      completedAt: daysAgo(8),
      startLatitude: 9.034,
      startLongitude: 38.7407,
      startAccuracyMeters: 8.4,
      endLatitude: 9.0341,
      endLongitude: 38.7408,
      endAccuracyMeters: 7.9,
      distanceFromStoreMeters: 41.2,
      gpsValid: false,
      notes: "GPS accuracy low; flagged for supervisor review.",
    });
  }

  // -- CANCELLED (assignment a3_cancelled)
  {
    const a = await asg(ID.assignments.a3_cancelled);
    rows.push({
      id: ID.audits.cancelled,
      assignmentId: a.id,
      auditorId: a.auditorId,
      storeId: a.storeId,
      surveyPeriodId: a.surveyPeriodId,
      status: "CANCELLED",
      startedAt: null,
      completedAt: null,
      notes: "Store closed on scheduled day; cancelled.",
    });
  }

  for (const r of rows) {
    await prisma.audit.upsert({ where: { id: r.id }, update: r, create: r });
  }

  // Keep assignment statuses consistent with audits
  await prisma.surveyAssignment.update({
    where: { id: ID.assignments.a1_notStarted },
    data: { status: "NOT_STARTED" },
  });
  await prisma.surveyAssignment.update({
    where: { id: ID.assignments.a1_inProgress },
    data: { status: "IN_PROGRESS" },
  });
  await prisma.surveyAssignment.update({
    where: { id: ID.assignments.a1_completed },
    data: { status: "COMPLETED" },
  });
  await prisma.surveyAssignment.update({
    where: { id: ID.assignments.a2_notStarted },
    data: { status: "NOT_STARTED" },
  });
  await prisma.surveyAssignment.update({
    where: { id: ID.assignments.a2_completed },
    data: { status: "COMPLETED" },
  });
  await prisma.surveyAssignment.update({
    where: { id: ID.assignments.a3_cancelled },
    data: { status: "CANCELLED" },
  });

  return rows.length;
}

// ============================================================
// 9. QUEENS PRICES (historical timeline, non-overlapping)
// ============================================================

async function seedQueensPrices() {
  // Helper to create non-overlapping timeline for a product.
  // `timeline` is an array of { from, to, price }.
  const makeTimeline = (productId, timeline) =>
    timeline.map((t, i) => ({
      // deterministic but unique id
      id: `qp-${productId}-${i}`,
      productId,
      price: t.price,
      effectiveFrom: day(t.from),
      effectiveTo: t.to ? day(t.to) : null,
      source: "Seed baseline",
      notes: t.notes ?? null,
    }));

  const timelines = [
    // Wheat Flour: three historical periods + current open-ended
    ...makeTimeline(ID.products.wheatFlour, [
      { from: "2024-09-01", to: "2024-10-01", price: 65.0 },
      { from: "2024-10-01", to: "2024-11-01", price: 68.0 },
      {
        from: "2024-11-01",
        to: null,
        price: 70.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.teff, [
      { from: "2024-09-01", to: "2024-10-01", price: 95.0 },
      {
        from: "2024-10-01",
        to: null,
        price: 98.5,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.rice, [
      { from: "2024-09-01", to: "2024-11-01", price: 110.0 },
      {
        from: "2024-11-01",
        to: null,
        price: 115.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.sugar, [
      {
        from: "2024-09-01",
        to: null,
        price: 120.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.oil, [
      { from: "2024-09-01", to: "2024-10-15", price: 210.0 },
      {
        from: "2024-10-15",
        to: null,
        price: 225.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.pasta, [
      {
        from: "2024-09-01",
        to: null,
        price: 85.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.macaroni, [
      {
        from: "2024-09-01",
        to: null,
        price: 80.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.bread, [
      {
        from: "2024-09-01",
        to: null,
        price: 25.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.milk, [
      { from: "2024-09-01", to: "2024-10-01", price: 45.0 },
      {
        from: "2024-10-01",
        to: null,
        price: 48.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.eggs, [
      {
        from: "2024-09-01",
        to: null,
        price: 180.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.coffee, [
      {
        from: "2024-09-01",
        to: null,
        price: 520.0,
        notes: "Current Queens price",
      },
    ]),
    ...makeTimeline(ID.products.lentils, [
      {
        from: "2024-09-01",
        to: null,
        price: 105.0,
        notes: "Current Queens price",
      },
    ]),
  ];

  for (const row of timelines) {
    await prisma.queensPrice.upsert({
      where: { id: row.id },
      update: row,
      create: row,
    });
  }
  return timelines.length;
}

// ============================================================
// 10. PRICE OBSERVATIONS
// Ensures:
//   - observation product belongs to the audit's assignment items
//   - availability → price consistency
//   - review state → reviewer consistency (ADMIN or MANAGER only)
//   - sync state → syncAttempts/syncedAt/syncError consistency
// ============================================================

async function seedObservations() {
  // Pre-fetch assignment items so we can validate product ↔ assignment
  const items = await prisma.assignmentItem.findMany({
    select: { assignmentId: true, productId: true },
  });
  const allowed = new Map(); // assignmentId → Set(productId)
  for (const it of items) {
    if (!allowed.has(it.assignmentId)) allowed.set(it.assignmentId, new Set());
    allowed.get(it.assignmentId).add(it.productId);
  }

  const audits = await prisma.audit.findMany({
    select: { id: true, assignmentId: true, auditorId: true },
  });
  const auditById = new Map(audits.map((a) => [a.id, a]));

  // Observations are described declaratively. We assign a stable
  // clientObservationId from a running counter so re-runs are safe.
  let seq = 0;
  const nextClientId = () => {
    seq += 1;
    return `seed-obs-${String(seq).padStart(5, "0")}`;
  };

  // Helper to insert one observation with upsert on clientObservationId
  const insertObs = async (o) => {
    const audit = auditById.get(o.auditId);
    if (!audit) throw new Error(`Unknown audit ${o.auditId}`);
    if (!allowed.get(audit.assignmentId)?.has(o.productId)) {
      throw new Error(
        `Seed error: product ${o.productId} is not assigned to audit ${o.auditId}'s assignment ${audit.assignmentId}`,
      );
    }
    const clientObservationId = nextClientId();

    // Derived sync fields
    let syncAttempts = 0,
      syncedAt = null,
      lastSyncAttemptAt = null,
      syncError = null;
    switch (o.syncStatus) {
      case "PENDING":
        syncAttempts = 0;
        break;
      case "SYNCING":
        syncAttempts = 1;
        lastSyncAttemptAt = daysAgo(0);
        break;
      case "SYNCED":
        syncAttempts = o.syncAttempts ?? 1;
        syncedAt = daysAgo(0);
        lastSyncAttemptAt = daysAgo(0);
        break;
      case "FAILED":
        syncAttempts = o.syncAttempts ?? 2;
        lastSyncAttemptAt = daysAgo(0);
        syncError = "Network timeout during upload";
        break;
    }

    const data = {
      clientObservationId,
      auditId: o.auditId,
      productId: o.productId,
      auditorId: audit.auditorId,
      availability: o.availability,
      price: o.price ?? null,
      observedUnit: o.observedUnit ?? null,
      packageSize: o.packageSize ?? null,
      capturedAt: o.capturedAt ?? daysAgo(1),
      syncStatus: o.syncStatus,
      syncAttempts,
      syncedAt,
      lastSyncAttemptAt,
      syncError,
      evidencePhotoUrl: o.evidencePhotoUrl ?? null,
      notes: o.notes ?? null,
      reviewStatus: o.reviewStatus,
      reviewedById: o.reviewedById ?? null,
      reviewedAt: o.reviewedAt ?? null,
      reviewNote: o.reviewNote ?? null,
    };

    await prisma.priceObservation.upsert({
      where: { clientObservationId },
      update: data,
      create: data,
    });
  };

  // -- IN_PROGRESS audit: mixed states, mixed availability, mixed sync --
  await insertObs({
    auditId: ID.audits.inProgress,
    productId: ID.products.wheatFlour,
    availability: "AVAILABLE",
    price: 72.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "PENDING",
    capturedAt: daysAgo(1),
  });
  await insertObs({
    auditId: ID.audits.inProgress,
    productId: ID.products.teff,
    availability: "AVAILABLE",
    price: 99.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "APPROVED",
    reviewedById: ID.users.manager1,
    reviewedAt: daysAgo(1),
    reviewNote: "Looks correct.",
    capturedAt: daysAgo(1),
  });
  await insertObs({
    auditId: ID.audits.inProgress,
    productId: ID.products.rice,
    availability: "OUT_OF_STOCK",
    price: null,
    syncStatus: "PENDING",
    reviewStatus: "PENDING",
    capturedAt: daysAgo(1),
  });
  await insertObs({
    auditId: ID.audits.inProgress,
    productId: ID.products.sugar,
    availability: "AVAILABLE",
    price: 124.0,
    observedUnit: "kg",
    syncStatus: "SYNCING",
    reviewStatus: "PENDING",
    capturedAt: daysAgo(0),
  });
  await insertObs({
    auditId: ID.audits.inProgress,
    productId: ID.products.oil,
    availability: "NOT_FOUND",
    price: null,
    syncStatus: "FAILED",
    reviewStatus: "PENDING",
    capturedAt: daysAgo(0),
    notes: "Shelf empty, couldn’t confirm SKU.",
  });
  await insertObs({
    auditId: ID.audits.inProgress,
    productId: ID.products.coffee,
    availability: "AVAILABLE",
    price: 540.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "NEEDS_REVIEW",
    capturedAt: daysAgo(1),
    evidencePhotoUrl: "https://example.com/evidence/coffee-001.jpg",
  });

  // -- COMPLETED audit #1: reviewer actions present --
  await insertObs({
    auditId: ID.audits.completed1,
    productId: ID.products.wheatFlour,
    availability: "AVAILABLE",
    price: 71.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "APPROVED",
    reviewedById: ID.users.manager1,
    reviewedAt: daysAgo(9),
    reviewNote: "Verified on-site.",
    capturedAt: daysAgo(10),
  });
  await insertObs({
    auditId: ID.audits.completed1,
    productId: ID.products.teff,
    availability: "AVAILABLE",
    price: 97.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "APPROVED",
    reviewedById: ID.users.admin,
    reviewedAt: daysAgo(9),
    reviewNote: "Good.",
    capturedAt: daysAgo(10),
  });
  await insertObs({
    auditId: ID.audits.completed1,
    productId: ID.products.sugar,
    availability: "AVAILABLE",
    price: 121.5,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "REJECTED",
    reviewedById: ID.users.manager2,
    reviewedAt: daysAgo(9),
    reviewNote: "Price looks like a promo; needs manager confirmation.",
    capturedAt: daysAgo(10),
  });
  await insertObs({
    auditId: ID.audits.completed1,
    productId: ID.products.potato,
    availability: "OUT_OF_STOCK",
    price: null,
    syncStatus: "SYNCED",
    reviewStatus: "APPROVED",
    reviewedById: ID.users.manager1,
    reviewedAt: daysAgo(9),
    reviewNote: "Confirmed out of stock.",
    capturedAt: daysAgo(10),
  });

  // -- COMPLETED audit #2 --
  await insertObs({
    auditId: ID.audits.completed2,
    productId: ID.products.wheatFlour,
    availability: "AVAILABLE",
    price: 69.5,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "APPROVED",
    reviewedById: ID.users.manager1,
    reviewedAt: daysAgo(12),
    reviewNote: "OK",
    capturedAt: daysAgo(13),
  });
  await insertObs({
    auditId: ID.audits.completed2,
    productId: ID.products.tomato,
    availability: "AVAILABLE",
    price: 55.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "PENDING",
    capturedAt: daysAgo(13),
  });
  await insertObs({
    auditId: ID.audits.completed2,
    productId: ID.products.onion,
    availability: "AVAILABLE",
    price: 42.0,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "APPROVED",
    reviewedById: ID.users.admin,
    reviewedAt: daysAgo(12),
    capturedAt: daysAgo(13),
  });

  // -- NEEDS_REVIEW audit: pending reviews, some sync issues --
  await insertObs({
    auditId: ID.audits.needsReview,
    productId: ID.products.wheatFlour,
    availability: "AVAILABLE",
    price: 71.75,
    observedUnit: "kg",
    syncStatus: "SYNCED",
    reviewStatus: "NEEDS_REVIEW",
    capturedAt: daysAgo(8),
    evidencePhotoUrl: "https://example.com/evidence/wheat-flour-002.jpg",
  });
  await insertObs({
    auditId: ID.audits.needsReview,
    productId: ID.products.teff,
    availability: "NOT_FOUND",
    price: null,
    syncStatus: "FAILED",
    reviewStatus: "NEEDS_REVIEW",
    capturedAt: daysAgo(8),
  });
  await insertObs({
    auditId: ID.audits.needsReview,
    productId: ID.products.rice,
    availability: "AVAILABLE",
    price: 116.0,
    observedUnit: "kg",
    syncStatus: "PENDING",
    reviewStatus: "PENDING",
    capturedAt: daysAgo(8),
  });

  // Total count: count rows for a clean summary.
  return prisma.priceObservation.count({
    where: { clientObservationId: { startsWith: "seed-obs-" } },
  });
}

// ============================================================
// 11. PRICE ANALYSES (current OPEN period)
// ============================================================

async function seedPriceAnalyses() {
  const current = ID.periods.current;

  // Helper: look up current Queens price for a product
  const queensCurrent = async (productId) => {
    const row = await prisma.queensPrice.findFirst({
      where: { productId, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    });
    return row?.price ?? null;
  };

  const plans = [
    {
      productId: ID.products.wheatFlour,
      action: "PRICE_DOWN",
      targetIndex: 95.0,
      notes: "Competitors undercutting slightly.",
    },
    {
      productId: ID.products.teff,
      action: "KEEP",
      targetIndex: 100.0,
      notes: "Stable at market.",
    },
    {
      productId: ID.products.rice,
      action: "PRICE_UP",
      targetIndex: 105.0,
      notes: "Cost pressure; room to raise.",
    },
    {
      productId: ID.products.sugar,
      action: "KEEP",
      targetIndex: 100.0,
      notes: "Flat market.",
    },
    {
      productId: ID.products.oil,
      action: "REVIEW",
      targetIndex: 102.0,
      notes: "Mixed signals, needs manual review.",
    },
    {
      productId: ID.products.pasta,
      action: "PRICE_DOWN",
      targetIndex: 96.0,
      notes: "Competitor promo.",
    },
    {
      productId: ID.products.macaroni,
      action: "KEEP",
      targetIndex: 100.0,
      notes: "Stable.",
    },
    {
      productId: ID.products.bread,
      action: "KEEP",
      targetIndex: 100.0,
      notes: "Regulated price band.",
    },
    {
      productId: ID.products.milk,
      action: "PRICE_UP",
      targetIndex: 104.0,
      notes: "Demand strong.",
    },
    {
      productId: ID.products.eggs,
      action: "KEEP",
      targetIndex: 100.0,
      notes: "Stable.",
    },
    {
      productId: ID.products.coffee,
      action: "REVIEW",
      targetIndex: 101.0,
      notes: "Volatile.",
    },
    {
      productId: ID.products.lentils,
      action: "PRICE_DOWN",
      targetIndex: 97.0,
      notes: "Imported substitutes cheaper.",
    },
  ];

  let count = 0;
  for (const p of plans) {
    const queensPrice = await queensCurrent(p.productId);
    if (queensPrice == null) continue;

    // Demo values — not a business formula. Clearly marked as such.
    const competitorAveragePrice = Number((queensPrice * 0.98).toFixed(2));
    const minimumCompetitorPrice = Number((queensPrice * 0.94).toFixed(2));
    const priceIndex = Number(
      ((queensPrice / competitorAveragePrice) * 100).toFixed(2),
    );

    const data = {
      productId: p.productId,
      surveyPeriodId: current,
      queensPrice,
      minimumCompetitorPrice,
      competitorAveragePrice,
      priceIndex,
      targetIndex: p.targetIndex,
      action: p.action,
      calculatedAt: daysAgo(1),
      notes: `${p.notes} (seed demo values, not computed by an app formula)`,
    };

    await prisma.priceAnalysis.upsert({
      where: {
        productId_surveyPeriodId: {
          productId: p.productId,
          surveyPeriodId: current,
        },
      },
      update: data,
      create: data,
    });
    count++;
  }
  return count;
}

// ============================================================
// 12. ALERTS
// ============================================================

async function seedAlerts() {
  const current = ID.periods.current;

  const queensCurrent = async (productId) => {
    const row = await prisma.queensPrice.findFirst({
      where: { productId, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    });
    return row?.price ?? null;
  };

  // Deterministic IDs for alerts
  const alertId = (n) =>
    `alert-0000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  const specs = [
    // product, type, severity, competitorPriceFactor, message, resolved?
    {
      productId: ID.products.wheatFlour,
      type: "PRICE_DOWN",
      severity: "HIGH",
      factor: 0.9,
      message: "Competitor pricing below Queens by >8%.",
      resolved: false,
    },
    {
      productId: ID.products.teff,
      type: "KEEP",
      severity: "LOW",
      factor: 1.01,
      message: "Minor fluctuation only.",
      resolved: false,
    },
    {
      productId: ID.products.rice,
      type: "PRICE_UP",
      severity: "MEDIUM",
      factor: 1.06,
      message: "Competitors raised prices; opportunity to follow.",
      resolved: false,
    },
    {
      productId: ID.products.sugar,
      type: "PRICE_DOWN",
      severity: "CRITICAL",
      factor: 0.82,
      message: "Sustained undercut; margin at risk.",
      resolved: false,
    },
    {
      productId: ID.products.oil,
      type: "REVIEW",
      severity: "MEDIUM",
      factor: 0.97,
      message: "Inconsistent observations across stores.",
      resolved: false,
    },
    {
      productId: ID.products.pasta,
      type: "PRICE_DOWN",
      severity: "LOW",
      factor: 0.96,
      message: "Minor drop.",
      resolved: true,
      resolutionNote: "Confirmed one-off promo; no action needed.",
    },
    {
      productId: ID.products.macaroni,
      type: "KEEP",
      severity: "LOW",
      factor: 1.0,
      message: "No material change.",
      resolved: true,
      resolutionNote: "Closed as informational.",
    },
    {
      productId: ID.products.bread,
      type: "KEEP",
      severity: "LOW",
      factor: 1.0,
      message: "Within regulated band.",
      resolved: true,
      resolutionNote: "Closed.",
    },
    {
      productId: ID.products.milk,
      type: "PRICE_UP",
      severity: "HIGH",
      factor: 1.1,
      message: "Competitors much higher; raise Queens price.",
      resolved: false,
    },
    {
      productId: ID.products.coffee,
      type: "REVIEW",
      severity: "CRITICAL",
      factor: 0.85,
      message: "Extreme spread across observations.",
      resolved: false,
    },
  ];

  let n = 0;
  for (const s of specs) {
    n++;
    const queensPrice = await queensCurrent(s.productId);
    if (queensPrice == null) continue;

    const competitorPrice = Number((Number(queensPrice) * s.factor).toFixed(2));
    const priceIndex = Number(
      ((Number(queensPrice) / competitorPrice) * 100).toFixed(2),
    );

    const data = {
      productId: s.productId,
      surveyPeriodId: current,
      type: s.type,
      severity: s.severity,
      message: s.message,
      queensPrice,
      competitorPrice,
      priceIndex,
      resolved: s.resolved,
      resolvedById: s.resolved ? ID.users.manager1 : null,
      resolvedAt: s.resolved ? daysAgo(2) : null,
      resolutionNote: s.resolutionNote ?? null,
    };

    await prisma.alert.upsert({
      where: { id: alertId(n) },
      update: data,
      create: { id: alertId(n), ...data },
    });
  }
  return specs.length;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n🌱 Seeding database (development/testing)...\n");

  const users = await seedUsers();
  const products = await seedProducts();
  const competitors = await seedCompetitors();
  const stores = await seedStores();
  const periods = await seedSurveyPeriods();
  const assignments = await seedAssignments();
  const assignmentItems = await seedAssignmentItems();
  const audits = await seedAudits();
  const queensPrices = await seedQueensPrices();
  const observations = await seedObservations();
  const priceAnalyses = await seedPriceAnalyses();
  const alerts = await seedAlerts();

  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    competitors: await prisma.competitor.count(),
    stores: await prisma.store.count(),
    periods: await prisma.surveyPeriod.count(),
    assignments: await prisma.surveyAssignment.count(),
    assignmentItems: await prisma.assignmentItem.count(),
    audits: await prisma.audit.count(),
    queensPrices: await prisma.queensPrice.count(),
    observations: await prisma.priceObservation.count(),
    priceAnalyses: await prisma.priceAnalysis.count(),
    alerts: await prisma.alert.count(),
  };

  const line = "=".repeat(60);

  console.log(line);
  console.log("DATABASE SEED COMPLETED");
  console.log(line);
  console.log(
    `Users:              ${counts.users}   (admin 1 / managers 2 / auditors 3)`,
  );
  console.log(`Products:           ${counts.products}`);
  console.log(`Competitors:        ${counts.competitors}`);
  console.log(`Stores:             ${counts.stores}`);
  console.log(`Survey Periods:     ${counts.periods}`);
  console.log(`Assignments:        ${counts.assignments}`);
  console.log(`Assignment Items:   ${counts.assignmentItems}`);
  console.log(`Audits:             ${counts.audits}`);
  console.log(`Queens Prices:      ${counts.queensPrices}`);
  console.log(`Observations:       ${counts.observations}`);
  console.log(`Price Analyses:     ${counts.priceAnalyses}`);
  console.log(`Alerts:             ${counts.alerts}`);

  console.log("\n" + line);
  console.log("TEST LOGIN CREDENTIALS (dev only)");
  console.log(line);
  console.log(`Password (all users):  ${DEV_PASSWORD}\n`);
  console.log("ADMIN");
  console.log("  Email: admin@priceaudit.test");
  console.log("MANAGER");
  console.log("  Email: manager1@priceaudit.test");
  console.log("  Email: manager2@priceaudit.test");
  console.log("FIELD AUDITOR");
  console.log("  Email: auditor1@priceaudit.test");
  console.log("  Email: auditor2@priceaudit.test");
  console.log("  Email: auditor3@priceaudit.test");

  console.log("\n" + line);
  console.log("USEFUL DETERMINISTIC IDs");
  console.log(line);
  console.log(`OPEN SURVEY PERIOD:      ${ID.periods.current}`);
  console.log(`CLOSED SURVEY PERIOD:    ${ID.periods.past}`);
  console.log(`DRAFT SURVEY PERIOD:     ${ID.periods.future}`);
  console.log(`IN-PROGRESS ASSIGNMENT:  ${ID.assignments.a1_inProgress}`);
  console.log(`NOT-STARTED ASSIGNMENT:  ${ID.assignments.a1_notStarted}`);
  console.log(`COMPLETED ASSIGNMENT:    ${ID.assignments.a1_completed}`);
  console.log(`IN-PROGRESS AUDIT:       ${ID.audits.inProgress}`);
  console.log(`COMPLETED AUDIT #1:      ${ID.audits.completed1}`);
  console.log(`NEEDS-REVIEW AUDIT:      ${ID.audits.needsReview}`);
  console.log(`CANCELLED AUDIT:         ${ID.audits.cancelled}`);
  console.log(`PRODUCT (Wheat Flour):   ${ID.products.wheatFlour}`);
  console.log(`PRODUCT (Teff):          ${ID.products.teff}`);
  console.log(`QUEENS PRICE:            qp-${ID.products.wheatFlour}-2`);
  console.log(`OBSERVATION:             seed-obs-00001`);
  console.log(
    `PRICE ANALYSIS:          composite key (productId + surveyPeriodId)`,
  );
  console.log(
    `ALERT #1:                alert-0000-0000-4000-8000-000000000001`,
  );
  console.log(line + "\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
