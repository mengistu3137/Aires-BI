import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { buildObservationReportPdf } from "./report.pdf.js";
import { buildObservationReportExcel } from "./report.excel.js";
import { slugify } from "./report.utils.js";

// Rejected observations are not valid evidence; cancelled audits are ignored.
const EXCLUDED_REVIEW_STATUSES = ["REJECTED"];
const EXCLUDED_AUDIT_STATUSES = ["CANCELLED"];
const UNCATEGORIZED = "Uncategorized";

const STORE_SELECT = {
  id: true,
  name: true,
  city: true,
  area: true,
  competitor: { select: { id: true, name: true } },
};

const PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  category: true,
  unit: true,
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const REVIEW_RANK = { APPROVED: 0, PENDING: 1, NEEDS_REVIEW: 2, REJECTED: 3 };

/**
 * When a product has several observations in the same store and survey period:
 *   1. AVAILABLE observations win over OUT_OF_STOCK / NOT_FOUND
 *   2. then APPROVED > PENDING > NEEDS_REVIEW
 *   3. then the most recently captured one
 */
const compareObservations = (a, b) => {
  const aAvail = a.availability === "AVAILABLE" ? 0 : 1;
  const bAvail = b.availability === "AVAILABLE" ? 0 : 1;
  if (aAvail !== bAvail) return aAvail - bAvail;

  const aRank = REVIEW_RANK[a.reviewStatus] ?? 9;
  const bRank = REVIEW_RANK[b.reviewStatus] ?? 9;
  if (aRank !== bRank) return aRank - bRank;

  return new Date(b.capturedAt) - new Date(a.capturedAt);
};

const pct = (part, total) =>
  total ? Math.round((part / total) * 1000) / 10 : 0;

const blankCounters = () => ({
  items: 0,
  recorded: 0,
  missing: 0,
  available: 0,
  outOfStock: 0,
  notFound: 0,
});

const tally = (counters, record) => {
  counters.items += 1;
  if (!record) {
    counters.missing += 1;
    return;
  }
  counters.recorded += 1;
  if (record.availability === "AVAILABLE") counters.available += 1;
  else if (record.availability === "OUT_OF_STOCK") counters.outOfStock += 1;
  else counters.notFound += 1;
};

const withCoverage = (counters) => ({
  ...counters,
  coveragePct: pct(counters.recorded, counters.items),
});

const byText = (a, b) =>
  String(a).localeCompare(String(b), "en", { sensitivity: "base" });

// ------------------------------------------------------------------
// Data loading
// ------------------------------------------------------------------

const loadRawData = async ({ surveyPeriodId, storeId }) => {
  const [period, store] = await Promise.all([
    prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } }),
    storeId
      ? prisma.store.findUnique({
          where: { id: storeId },
          select: STORE_SELECT,
        })
      : Promise.resolve(null),
  ]);

  if (!period) throw new ApiError(404, "Survey period not found");
  if (storeId && !store) throw new ApiError(404, "Store not found");

  const auditWhere = {
    surveyPeriodId,
    status: { notIn: EXCLUDED_AUDIT_STATUSES },
    ...(storeId ? { storeId } : {}),
  };

  const [observations, assignmentItems] = await Promise.all([
    prisma.priceObservation.findMany({
      where: {
        audit: auditWhere,
        reviewStatus: { notIn: EXCLUDED_REVIEW_STATUSES },
      },
      orderBy: { capturedAt: "desc" },
      select: {
        id: true,
        productId: true,
        availability: true,
        price: true,
        observedUnit: true,
        packageSize: true,
        capturedAt: true,
        reviewStatus: true,
        notes: true,
        product: { select: PRODUCT_SELECT },
        auditor: { select: { id: true, name: true } },
        audit: { select: { id: true, store: { select: STORE_SELECT } } },
      },
    }),
    prisma.assignmentItem.findMany({
      where: {
        assignment: {
          surveyPeriodId,
          status: { not: "CANCELLED" },
          ...(storeId ? { storeId } : {}),
        },
      },
      select: {
        productId: true,
        product: { select: PRODUCT_SELECT },
        assignment: {
          select: { storeId: true, store: { select: STORE_SELECT } },
        },
      },
    }),
  ]);

  return { period, store, observations, assignmentItems };
};

// ------------------------------------------------------------------
// Report model
// ------------------------------------------------------------------

/**
 * Builds the model used by the JSON summary, the PDF and the Excel report.
 *
 *   model.categories[].products[].cells[storeId]
 *     - record      -> chosen observation for that store/product
 *     - null        -> product was assigned to the store but nothing was recorded
 *     - undefined   -> product is not part of that store's checklist
 */
export const buildReportModel = ({
  period,
  store,
  observations,
  assignmentItems,
  user,
}) => {
  const storesMap = new Map();
  const productsMap = new Map();
  const pairs = new Map(); // `${storeId}|${productId}` -> { storeId, productId, observations[] }

  const registerStore = (s) => {
    if (!s || storesMap.has(s.id)) return;
    storesMap.set(s.id, {
      id: s.id,
      name: s.name,
      city: s.city ?? null,
      area: s.area ?? null,
      competitorId: s.competitor?.id ?? null,
      competitorName: s.competitor?.name ?? "",
    });
  };

  const registerProduct = (p) => {
    if (!p || productsMap.has(p.id)) return;
    productsMap.set(p.id, {
      id: p.id,
      name: p.name,
      code: p.sku || p.barcode || p.id,
      unit: p.unit ?? "",
      category: p.category?.trim() || UNCATEGORIZED,
    });
  };

  const getPair = (storeId, productId) => {
    const key = `${storeId}|${productId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { storeId, productId, observations: [] });
    }
    return pairs.get(key);
  };

  // Expected checklist (assigned products) so missing items can be reported
  for (const item of assignmentItems) {
    registerStore(item.assignment.store);
    registerProduct(item.product);
    getPair(item.assignment.storeId, item.productId);
  }

  // Recorded observations
  for (const obs of observations) {
    const obsStore = obs.audit.store;
    registerStore(obsStore);
    registerProduct(obs.product);
    getPair(obsStore.id, obs.productId).observations.push(obs);
  }

  if (pairs.size === 0) {
    throw new ApiError(
      404,
      store
        ? "No price observations or assignments found for this store in the selected survey period"
        : "No price observations or assignments found for the selected survey period",
    );
  }

  // Pick one observation per store/product
  let duplicatesResolved = 0;
  for (const pair of pairs.values()) {
    const sorted = [...pair.observations].sort(compareObservations);
    const best = sorted[0];
    if (sorted.length > 1) duplicatesResolved += 1;

    pair.record = best
      ? {
          observationId: best.id,
          storeId: pair.storeId,
          productId: pair.productId,
          availability: best.availability,
          price:
            best.price !== null && best.price !== undefined
              ? Number(best.price)
              : null,
          observedUnit: best.observedUnit ?? null,
          packageSize: best.packageSize ?? null,
          capturedAt: best.capturedAt,
          reviewStatus: best.reviewStatus,
          notes: best.notes ?? null,
          auditorName: best.auditor?.name ?? "",
          alternativesCount: sorted.length - 1,
        }
      : null;
  }

  // Columns (stores)
  const stores = [...storesMap.values()].sort(
    (a, b) =>
      byText(a.competitorName, b.competitorName) || byText(a.name, b.name),
  );

  // Rows grouped by category
  const categoriesMap = new Map();
  for (const product of productsMap.values()) {
    if (!categoriesMap.has(product.category)) {
      categoriesMap.set(product.category, []);
    }
    categoriesMap.get(product.category).push(product);
  }

  const categories = [...categoriesMap.keys()].sort(byText).map((name) => ({
    name,
    products: categoriesMap
      .get(name)
      .sort((a, b) => byText(a.name, b.name))
      .map((product) => {
        const cells = {};
        for (const s of stores) {
          const pair = pairs.get(`${s.id}|${product.id}`);
          cells[s.id] = pair ? pair.record : undefined;
        }
        return { ...product, cells };
      }),
  }));

  // Summary
  const totalCounters = blankCounters();
  const categoryCounters = new Map(
    categories.map((c) => [c.name, blankCounters()]),
  );
  const storeCounters = new Map(stores.map((s) => [s.id, blankCounters()]));
  const review = { APPROVED: 0, PENDING: 0, NEEDS_REVIEW: 0 };
  let lowest = null;
  let highest = null;

  for (const pair of pairs.values()) {
    const product = productsMap.get(pair.productId);
    const storeInfo = storesMap.get(pair.storeId);

    tally(totalCounters, pair.record);
    tally(categoryCounters.get(product.category), pair.record);
    tally(storeCounters.get(pair.storeId), pair.record);

    if (pair.record) {
      if (review[pair.record.reviewStatus] !== undefined) {
        review[pair.record.reviewStatus] += 1;
      }
      if (
        pair.record.availability === "AVAILABLE" &&
        pair.record.price !== null
      ) {
        const entry = {
          product: product.name,
          productCode: product.code,
          store: storeInfo.name,
          price: pair.record.price,
        };
        if (!lowest || entry.price < lowest.price) lowest = entry;
        if (!highest || entry.price > highest.price) highest = entry;
      }
    }
  }

  const summary = {
    totals: {
      stores: stores.length,
      products: productsMap.size,
      ...withCoverage(totalCounters),
      availabilityRatePct: pct(totalCounters.available, totalCounters.recorded),
      duplicatesResolved,
    },
    review,
    byCategory: categories.map((c) => ({
      category: c.name,
      products: c.products.length,
      ...withCoverage(categoryCounters.get(c.name)),
    })),
    byStore: stores.map((s) => ({
      storeId: s.id,
      store: s.name,
      competitor: s.competitorName,
      ...withCoverage(storeCounters.get(s.id)),
    })),
    priceRange: lowest && highest ? { lowest, highest } : null,
  };

  return {
    scope: store ? "STORE" : "ALL_STORES",
    generatedAt: new Date(),
    generatedBy: user?.name || user?.email || "",
    period: {
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
    },
    store: store
      ? {
          id: store.id,
          name: store.name,
          city: store.city ?? null,
          area: store.area ?? null,
          competitorId: store.competitor?.id ?? null,
          competitorName: store.competitor?.name ?? "",
        }
      : null,
    stores,
    categories,
    summary,
  };
};

const loadReportModel = async ({ surveyPeriodId, storeId, user }) => {
  const cleanPeriodId = String(surveyPeriodId ?? "").trim();
  const cleanStoreId = storeId ? String(storeId).trim() : undefined;

  if (!cleanPeriodId) throw new ApiError(400, "surveyPeriodId is required");

  const raw = await loadRawData({
    surveyPeriodId: cleanPeriodId,
    storeId: cleanStoreId,
  });

  return buildReportModel({ ...raw, user });
};

const buildFilename = (model, extension) => {
  const parts = ["price-report", slugify(model.period.name)];
  if (model.store) parts.push(slugify(model.store.name));
  parts.push(new Date().toISOString().slice(0, 10));
  return `${parts.join("_")}.${extension}`;
};

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export const getObservationReportSummary = async (params) => {
  const model = await loadReportModel(params);
  return {
    scope: model.scope,
    generatedAt: model.generatedAt,
    period: model.period,
    store: model.store,
    summary: model.summary,
  };
};

export const generateObservationReportPdf = async (params) => {
  const model = await loadReportModel(params);
  const buffer = await buildObservationReportPdf(model);
  return {
    buffer,
    filename: buildFilename(model, "pdf"),
    contentType: "application/pdf",
  };
};

export const generateObservationReportExcel = async (params) => {
  const model = await loadReportModel(params);
  const buffer = await buildObservationReportExcel(model);
  return {
    buffer,
    filename: buildFilename(model, "xlsx"),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
};

export const observationReportService = {
  getObservationReportSummary,
  generateObservationReportPdf,
  generateObservationReportExcel,
};
