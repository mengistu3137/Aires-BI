import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { buildObservationReportPdf } from "./report.pdf.js";
import { buildObservationReportExcel } from "./report.excel.js";
import { slugify } from "./report.utils.js";
import {
  REPORT_TYPES,
  REPORT_TYPE_KEYS,
  matchColumn,
  normalizeReportType,
} from "./report.config.js";

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
 * When a product has several observations for the same competitor
 * (any of its stores) in the same survey period:
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

const categoryOf = (product) => product.category?.trim() || UNCATEGORIZED;

// ------------------------------------------------------------------
// Data loading
// ------------------------------------------------------------------

/** Current Queens price per product: effective now, newest effectiveFrom wins. */
const loadCurrentQueensPrices = async (productIds) => {
  const result = new Map();
  if (productIds.length === 0) return result;

  const now = new Date();
  const rows = await prisma.queensPrice.findMany({
    where: {
      productId: { in: productIds },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      productId: true,
      price: true,
      effectiveFrom: true,
      effectiveTo: true,
      source: true,
    },
  });

  for (const row of rows) {
    if (!result.has(row.productId)) result.set(row.productId, row);
  }
  return result;
};

const loadRawData = async ({ surveyPeriodId, storeId, needsQueens }) => {
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

  let queensPrices = new Map();
  if (needsQueens) {
    const productIds = [
      ...new Set([
        ...observations.map((o) => o.productId),
        ...assignmentItems.map((i) => i.productId),
      ]),
    ];
    queensPrices = await loadCurrentQueensPrices(productIds);
  }

  return { period, store, observations, assignmentItems, queensPrices };
};

// ------------------------------------------------------------------
// Report model
// ------------------------------------------------------------------

/**
 * Builds one section (= one report type) of the report.
 *
 *   section.columns[]                    one column per competitor (+ Queens Price)
 *   section.categories[].products[].cells[columnKey]
 *     - record     -> chosen observation for that competitor/product
 *                     (Queens Price column: { kind: "QUEENS", price, ... })
 *     - null       -> product was assigned to the competitor's stores but nothing was recorded
 *     - undefined  -> no data / not on the checklist (rendered blank)
 *
 * Returns null when the section has nothing to show.
 */
const buildSection = (
  config,
  { observations, assignmentItems, queensPrices, store },
) => {
  let columns = config.columns;

  // Single-store export: keep only that store's competitor (+ Queens Price)
  if (store) {
    const storeColumn = matchColumn(columns, store.competitor?.name);
    if (!storeColumn) return null;
    columns = columns.filter(
      (c) => c.kind === "QUEENS" || c.key === storeColumn.key,
    );
  }

  const competitorColumns = columns.filter((c) => c.kind === "COMPETITOR");
  const queensColumn = columns.find((c) => c.kind === "QUEENS") || null;

  const productsMap = new Map();
  const pairs = new Map(); // `${columnKey}|${productId}` -> { columnKey, productId, observations[] }
  const columnStores = new Map(competitorColumns.map((c) => [c.key, new Set()]));

  const registerProduct = (p) => {
    if (!p || productsMap.has(p.id)) return;
    productsMap.set(p.id, {
      id: p.id,
      name: p.name,
      code: p.sku || p.barcode || p.id,
      unit: p.unit ?? "",
      category: categoryOf(p),
    });
  };

  const getPair = (columnKey, productId) => {
    const key = `${columnKey}|${productId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { columnKey, productId, observations: [] });
    }
    return pairs.get(key);
  };

  // Expected checklist (assigned products) so missing items can be reported
  for (const item of assignmentItems) {
    const column = matchColumn(
      competitorColumns,
      item.assignment.store?.competitor?.name,
    );
    if (!column || !config.acceptsCategory(categoryOf(item.product))) continue;

    columnStores.get(column.key).add(item.assignment.storeId);
    registerProduct(item.product);
    getPair(column.key, item.productId);
  }

  // Recorded observations
  for (const obs of observations) {
    const obsStore = obs.audit.store;
    const column = matchColumn(competitorColumns, obsStore?.competitor?.name);
    if (!column || !config.acceptsCategory(categoryOf(obs.product))) continue;

    columnStores.get(column.key).add(obsStore.id);
    registerProduct(obs.product);
    getPair(column.key, obs.productId).observations.push(obs);
  }

  if (pairs.size === 0) return null;

  // Pick one observation per competitor/product (across all its stores)
  let duplicatesResolved = 0;
  for (const pair of pairs.values()) {
    const sorted = [...pair.observations].sort(compareObservations);
    const best = sorted[0];
    if (sorted.length > 1) duplicatesResolved += 1;

    pair.record = best
      ? {
          observationId: best.id,
          kind: "OBSERVATION",
          columnKey: pair.columnKey,
          productId: pair.productId,
          storeId: best.audit.store.id,
          storeName: best.audit.store.name,
          city: best.audit.store.city ?? null,
          area: best.audit.store.area ?? null,
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

  // Rows grouped by category
  const categoriesMap = new Map();
  for (const product of productsMap.values()) {
    if (!categoriesMap.has(product.category)) {
      categoriesMap.set(product.category, []);
    }
    categoriesMap.get(product.category).push(product);
  }

  let queensPriced = 0;
  const categories = [...categoriesMap.keys()].sort(byText).map((name) => ({
    name,
    products: categoriesMap
      .get(name)
      .sort((a, b) => byText(a.name, b.name))
      .map((product) => {
        const cells = {};
        for (const column of columns) {
          if (column.kind === "QUEENS") {
            const q = queensPrices.get(product.id);
            if (q) {
              queensPriced += 1;
              cells[column.key] = {
                kind: "QUEENS",
                availability: "AVAILABLE",
                price: Number(q.price),
                effectiveFrom: q.effectiveFrom,
                effectiveTo: q.effectiveTo ?? null,
                source: q.source ?? null,
              };
            } else {
              cells[column.key] = undefined;
            }
          } else {
            const pair = pairs.get(`${column.key}|${product.id}`);
            cells[column.key] = pair ? pair.record : undefined;
          }
        }
        return { ...product, cells };
      }),
  }));

  // Summary (Queens Price is our own price list, so it is not part of the audit counters)
  const totalCounters = blankCounters();
  const categoryCounters = new Map(
    categories.map((c) => [c.name, blankCounters()]),
  );
  const columnCounters = new Map(
    competitorColumns.map((c) => [c.key, blankCounters()]),
  );
  const review = { APPROVED: 0, PENDING: 0, NEEDS_REVIEW: 0 };
  let lowest = null;
  let highest = null;

  for (const pair of pairs.values()) {
    const product = productsMap.get(pair.productId);
    const column = competitorColumns.find((c) => c.key === pair.columnKey);

    tally(totalCounters, pair.record);
    tally(categoryCounters.get(product.category), pair.record);
    tally(columnCounters.get(pair.columnKey), pair.record);

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
          competitor: column.label,
          store: pair.record.storeName,
          price: pair.record.price,
        };
        if (!lowest || entry.price < lowest.price) lowest = entry;
        if (!highest || entry.price > highest.price) highest = entry;
      }
    }
  }

  const allStoreIds = new Set();
  for (const set of columnStores.values()) {
    for (const id of set) allStoreIds.add(id);
  }

  const summary = {
    totals: {
      competitors: competitorColumns.length,
      stores: allStoreIds.size,
      products: productsMap.size,
      ...withCoverage(totalCounters),
      availabilityRatePct: pct(totalCounters.available, totalCounters.recorded),
      duplicatesResolved,
    },
    review,
    queens: queensColumn
      ? { products: productsMap.size, priced: queensPriced }
      : null,
    byCategory: categories.map((c) => ({
      category: c.name,
      products: c.products.length,
      ...withCoverage(categoryCounters.get(c.name)),
    })),
    byCompetitor: competitorColumns.map((c) => ({
      competitorKey: c.key,
      competitor: c.label,
      stores: columnStores.get(c.key).size,
      ...withCoverage(columnCounters.get(c.key)),
    })),
    priceRange: lowest && highest ? { lowest, highest } : null,
  };

  return {
    type: config.key,
    label: config.label,
    description: config.description,
    columns: columns.map((c) => ({
      key: c.key,
      label: c.label,
      kind: c.kind,
      stores: c.kind === "COMPETITOR" ? columnStores.get(c.key).size : 0,
    })),
    categories,
    summary,
  };
};

/**
 * Builds the model used by the JSON summary, the PDF and the Excel report.
 *
 *   model.sections[]  - one per report type (Fresh Corner / Ultra-Sensitive)
 */
export const buildReportModel = ({
  period,
  store,
  observations,
  assignmentItems,
  queensPrices,
  reportTypes,
  user,
}) => {
  const sections = reportTypes
    .map((type) =>
      buildSection(REPORT_TYPES[type], {
        observations,
        assignmentItems,
        queensPrices,
        store,
      }),
    )
    .filter(Boolean);

  if (sections.length === 0) {
    const label =
      reportTypes.length === 1 ? ` (${REPORT_TYPES[reportTypes[0]].label})` : "";
    throw new ApiError(
      404,
      store
        ? `No price observations or assignments found for this store in the selected survey period${label}`
        : `No price observations or assignments found for the selected survey period${label}`,
    );
  }

  return {
    scope: store ? "STORE" : "ALL_STORES",
    reportType: reportTypes.length === 1 ? reportTypes[0] : "ALL",
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
    sections,
  };
};

const loadReportModel = async ({
  surveyPeriodId,
  storeId,
  reportType,
  user,
}) => {
  const cleanPeriodId = String(surveyPeriodId ?? "").trim();
  const cleanStoreId = storeId ? String(storeId).trim() : undefined;

  if (!cleanPeriodId) throw new ApiError(400, "surveyPeriodId is required");

  const requested = normalizeReportType(reportType);
  if (requested === null) {
    throw new ApiError(
      400,
      `reportType must be one of: ${REPORT_TYPE_KEYS.join(", ")} (omit it to get both)`,
    );
  }
  const reportTypes = requested ? [requested] : REPORT_TYPE_KEYS;

  const raw = await loadRawData({
    surveyPeriodId: cleanPeriodId,
    storeId: cleanStoreId,
    needsQueens: reportTypes.includes("FRESH_CORNER"),
  });

  return buildReportModel({ ...raw, reportTypes, user });
};

const buildFilename = (model, extension) => {
  const parts = ["price-report", slugify(model.period.name)];
  if (model.reportType !== "ALL") {
    parts.push(REPORT_TYPES[model.reportType].slug);
  }
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
    reportType: model.reportType,
    generatedAt: model.generatedAt,
    period: model.period,
    store: model.store,
    sections: model.sections.map((section) => ({
      type: section.type,
      label: section.label,
      description: section.description,
      columns: section.columns,
      summary: section.summary,
    })),
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