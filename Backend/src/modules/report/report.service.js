// Backend/src/modules/report/report.service.js
import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { buildObservationReportPdf } from "./report.pdf.js";
import { buildObservationReportExcel } from "./report.excel.js";
import { groq, getActiveGroqModel } from "../../config/groq.js";
import { buildObservationReportDocx } from "./report.docx.js";
import { slugify } from "./report.utils.js";
import {
  CATEGORY_ORDER,
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

const REVIEW_RANK = { APPROVED: 0, PENDING: 1, NEEDS_REVIEW: 2, REJECTED: 3 };

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

const mergeCounters = (target, source) => {
  target.items += source.items;
  target.recorded += source.recorded;
  target.missing += source.missing;
  target.available += source.available;
  target.outOfStock += source.outOfStock;
  target.notFound += source.notFound;
};

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

// ============================================================
// Date-range resolution
// ============================================================

/**
 * Resolves the survey period(s) / date range(s) selected by the user
 * into a normalized list of "range descriptors".
 *
 * Always returns an array. Each item is one of:
 *   { type: "PERIOD",  periodRecord, startDate, endDate, periodName, periodId }
 *   { type: "DATE",    startDate, endDate, periodName, periodId }
 *   { type: "ALL",     startDate, endDate, periodName, periodId }
 */
const resolveDateRanges = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
}) => {
  const now = new Date();

  // Normalize to array of ids (both shapes accepted)
  const rawIds = Array.isArray(surveyPeriodId)
    ? surveyPeriodId
    : surveyPeriodId
      ? [surveyPeriodId]
      : [];

  const periodIds = rawIds
    .map((v) => String(v ?? "").trim())
    .filter((v) => v && v !== "ALL" && v !== "all");

  // 1. Explicit Week Range
  if (rangeType === "WEEK") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return [
      {
        type: "DATE",
        startDate: start,
        endDate: now,
        periodName: `Past 7 Days (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
        periodId: "range-week",
      },
    ];
  }

  // 2. Explicit Month Range
  if (rangeType === "MONTH") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return [
      {
        type: "DATE",
        startDate: start,
        endDate: now,
        periodName: `Past 30 Days (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
        periodId: "range-month",
      },
    ];
  }

  // 3. Custom Date Range
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (String(endDate).length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      return [
        {
          type: "DATE",
          startDate: start,
          endDate: end,
          periodName: `Custom Range (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
          periodId: "range-custom",
        },
      ];
    }
  }

  // 4. One or more specific survey periods
  if (periodIds.length > 0) {
    const periods = await prisma.surveyPeriod.findMany({
      where: { id: { in: periodIds } },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
    });

    if (periods.length === 0) {
      throw new ApiError(
        404,
        `No survey periods found for ids: ${periodIds.join(", ")}`,
      );
    }

    return periods.map((period) => ({
      type: "PERIOD",
      periodRecord: period,
      startDate: period.startDate,
      endDate: period.endDate,
      periodName: period.name,
      periodId: period.id,
    }));
  }

  // 5. No period and no range supplied → ALL survey data ever gathered.
  const allTime = await prisma.priceObservation.aggregate({
    _min: { capturedAt: true },
    _max: { capturedAt: true },
  });

  const firstCaptured = allTime._min.capturedAt;
  const lastCaptured = allTime._max.capturedAt;

  return [
    {
      type: "ALL",
      startDate: firstCaptured || new Date(0),
      endDate: lastCaptured || now,
      periodName: firstCaptured
        ? `All Survey Data (${firstCaptured.toISOString().slice(0, 10)} – ${lastCaptured.toISOString().slice(0, 10)})`
        : "All Survey Data",
      periodId: "all-data",
    },
  ];
};

// ============================================================
// Raw data loading
// ============================================================

const loadRawData = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
  storeId,
  needsQueens,
}) => {
  const ranges = await resolveDateRanges({
    surveyPeriodId,
    rangeType,
    startDate,
    endDate,
  });

  const periodIds = ranges
    .filter((r) => r.type === "PERIOD")
    .map((r) => r.periodId);
  const dateRanges = ranges.filter((r) => r.type === "DATE");
  const isAllData = ranges.length === 1 && ranges[0].type === "ALL";

  // Normalize storeIds to array
  const rawStoreIds = Array.isArray(storeId)
    ? storeId
    : storeId
      ? [storeId]
      : [];
  const storeIds = rawStoreIds
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  const stores = storeIds.length
    ? await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: STORE_SELECT,
    })
    : [];

  if (storeIds.length > 0 && stores.length !== storeIds.length) {
    const found = new Set(stores.map((s) => s.id));
    const missing = storeIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new ApiError(
        404,
        `Store(s) not found: ${missing.join(", ")}`,
      );
    }
  }

  // Human-readable label for the report header
  const period = {
    id:
      ranges.length === 1 ? ranges[0].periodId : "multi-range",
    name:
      ranges.length === 1
        ? ranges[0].periodName
        : `${ranges.length} survey cycles selected`,
    startDate: ranges.reduce(
      (min, r) =>
        !min || r.startDate < min ? r.startDate : min,
      null,
    ),
    endDate: ranges.reduce(
      (max, r) =>
        !max || r.endDate > max ? r.endDate : max,
      null,
    ),
    status: ranges.length === 1 && ranges[0].periodRecord
      ? ranges[0].periodRecord.status
      : "MIXED",
  };

  // Build the observation filter
  const observationWhere = {
    audit: {
      status: { notIn: EXCLUDED_AUDIT_STATUSES },
      ...(storeIds.length ? { storeId: { in: storeIds } } : {}),
    },
    reviewStatus: { notIn: EXCLUDED_REVIEW_STATUSES },
  };

  if (periodIds.length > 0 && dateRanges.length === 0) {
    // Only periods selected
    observationWhere.audit.surveyPeriodId = { in: periodIds };
  } else if (dateRanges.length > 0 && periodIds.length === 0) {
    // Only date-range(s) selected — OR them together
    observationWhere.OR = dateRanges.map((r) => ({
      capturedAt: { gte: r.startDate, lte: r.endDate },
    }));
  } else if (periodIds.length > 0 && dateRanges.length > 0) {
    // Both — periods OR date ranges
    observationWhere.OR = [
      { audit: { surveyPeriodId: { in: periodIds } } },
      ...dateRanges.map((r) => ({
        capturedAt: { gte: r.startDate, lte: r.endDate },
      })),
    ];
  }
  // else: isAllData → no filter

  // Build the assignment items filter
  const assignmentWhere = {
    assignment: {
      status: { not: "CANCELLED" },
      ...(storeIds.length ? { storeId: { in: storeIds } } : {}),
    },
  };

  if (periodIds.length > 0 && dateRanges.length === 0) {
    assignmentWhere.assignment.surveyPeriodId = { in: periodIds };
  } else if (dateRanges.length > 0 && periodIds.length === 0) {
    assignmentWhere.OR = dateRanges.map((r) => ({
      assignment: {
        surveyPeriod: {
          startDate: { lte: r.endDate },
          endDate: { gte: r.startDate },
        },
      },
    }));
  } else if (periodIds.length > 0 && dateRanges.length > 0) {
    assignmentWhere.OR = [
      { assignment: { surveyPeriodId: { in: periodIds } } },
      ...dateRanges.map((r) => ({
        assignment: {
          surveyPeriod: {
            startDate: { lte: r.endDate },
            endDate: { gte: r.startDate },
          },
        },
      })),
    ];
  }

  // Queen's master list — canonical row set
  const masterProducts = await prisma.product.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    select: PRODUCT_SELECT,
  });

  const [observations, assignmentItems] = await Promise.all([
    prisma.priceObservation.findMany({
      where: observationWhere,
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
        audit: {
          select: {
            id: true,
            surveyPeriodId: true,
            store: { select: STORE_SELECT },
          },
        },
      },
    }),
    prisma.assignmentItem.findMany({
      where: assignmentWhere,
      select: {
        productId: true,
        product: { select: PRODUCT_SELECT },
        assignment: {
          select: {
            storeId: true,
            surveyPeriodId: true,
            store: { select: STORE_SELECT },
          },
        },
      },
    }),
  ]);

  // Which survey cycles to include as cycle blocks
  const cycleIds = new Set();
  for (const obs of observations) {
    if (obs.audit?.surveyPeriodId) cycleIds.add(obs.audit.surveyPeriodId);
  }
  for (const item of assignmentItems) {
    if (item.assignment?.surveyPeriodId) cycleIds.add(item.assignment.surveyPeriodId);
  }

  let cycles = [];
  if (cycleIds.size > 0) {
    cycles = await prisma.surveyPeriod.findMany({
      where: { id: { in: [...cycleIds] } },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
    });
  }

  let queensPrices = new Map();
  if (needsQueens) {
    const productIds = masterProducts.map((p) => p.id);
    queensPrices = await loadCurrentQueensPrices(productIds);
  }

  return {
    period,
    store: stores.length === 1 ? stores[0] : null,
    stores,
    observations,
    assignmentItems,
    queensPrices,
    cycles,
    masterProducts,
  };
};

// ============================================================
// Section builder (per report type) — cycle-aware, list-driven
// ============================================================

const buildCycle = (
  config,
  cycle,
  { observations, assignmentItems, queensPrices, store, masterProducts },
) => {
  let columns = config.columns;

  if (store) {
    const storeColumn = matchColumn(columns, store.competitor?.name);
    if (!storeColumn) return null;
    columns = columns.filter(
      (c) => c.kind === "QUEENS" || c.key === storeColumn.key,
    );
  }

  const competitorColumns = columns.filter((c) => c.kind === "COMPETITOR");
  const queensColumn = columns.find((c) => c.kind === "QUEENS") || null;

  const products = masterProducts.filter((p) =>
    config.acceptsCategory(categoryOf(p)),
  );
  if (products.length === 0) return null;

  const pairs = new Map();
  const columnStores = new Map(competitorColumns.map((c) => [c.key, new Set()]));

  const getPair = (columnKey, productId) => {
    const key = `${columnKey}|${productId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { columnKey, productId, observations: [] });
    }
    return pairs.get(key);
  };

  for (const item of assignmentItems) {
    if (item.assignment?.surveyPeriodId !== cycle.id) continue;
    const column = matchColumn(
      competitorColumns,
      item.assignment.store?.competitor?.name,
    );
    if (!column || !config.acceptsCategory(categoryOf(item.product))) continue;

    columnStores.get(column.key).add(item.assignment.storeId);
    getPair(column.key, item.productId);
  }

  for (const obs of observations) {
    if (obs.audit?.surveyPeriodId !== cycle.id) continue;
    const obsStore = obs.audit.store;
    const column = matchColumn(competitorColumns, obsStore?.competitor?.name);
    if (!column || !config.acceptsCategory(categoryOf(obs.product))) continue;

    columnStores.get(column.key).add(obsStore.id);
    getPair(column.key, obs.productId).observations.push(obs);
  }

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

  const categoriesMap = new Map();
  for (const p of products) {
    const cat = categoryOf(p);
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
    categoriesMap.get(cat).push({
      id: p.id,
      name: p.name,
      code: p.sku || p.barcode || p.id,
      unit: p.unit ?? "",
      category: cat,
    });
  }

  let queensPriced = 0;

  // ─────────────────────────────────────────────────────────────
  // Category order: use CATEGORY_ORDER[config.key] as the primary
  // sort, falling back to alphabetical for anything not listed.
  // This makes the Fresh Corner PDF match the Queen's master list
  // layout (Vegetables → Fruits → Dairy → Meat → Poultry) instead
  // of sorting alphabetically (Dairy → Fresh → Meat → Poultry).
  // ─────────────────────────────────────────────────────────────
  const categoryOrder = CATEGORY_ORDER[config.key] || [];
  const rankOf = (name) => {
    const idx = categoryOrder.indexOf(name);
    return idx === -1 ? categoryOrder.length + 1 : idx;
  };

  const sortedCategoryNames = [...categoriesMap.keys()].sort((a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    return byText(a, b);
  });

  const categories = sortedCategoryNames.map((name) => ({
    name,
    products: categoriesMap.get(name).map((product) => {
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

  const totalCounters = blankCounters();
  const categoryCounters = new Map(categories.map((c) => [c.name, blankCounters()]));
  const columnCounters = new Map(competitorColumns.map((c) => [c.key, blankCounters()]));
  const review = { APPROVED: 0, PENDING: 0, NEEDS_REVIEW: 0 };
  let lowest = null;
  let highest = null;

  for (const pair of pairs.values()) {
    const product = products.find((p) => p.id === pair.productId);
    if (!product) continue;
    const column = competitorColumns.find((c) => c.key === pair.columnKey);
    if (!column) continue;

    tally(totalCounters, pair.record);
    tally(categoryCounters.get(categoryOf(product)), pair.record);
    tally(columnCounters.get(pair.columnKey), pair.record);

    if (pair.record) {
      if (review[pair.record.reviewStatus] !== undefined) {
        review[pair.record.reviewStatus] += 1;
      }
      if (pair.record.availability === "AVAILABLE" && pair.record.price !== null) {
        const entry = {
          product: product.name,
          productCode: product.sku || product.barcode || product.id,
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
      products: products.length,
      ...withCoverage(totalCounters),
      availabilityRatePct: pct(totalCounters.available, totalCounters.recorded),
      duplicatesResolved,
    },
    review,
    queens: queensColumn
      ? { products: products.length, priced: queensPriced }
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
    cycle: {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
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

const aggregateSummaries = (cycles) => {
  if (cycles.length === 0) return null;
  if (cycles.length === 1) return cycles[0].summary;

  const totals = blankCounters();
  const review = { APPROVED: 0, PENDING: 0, NEEDS_REVIEW: 0 };
  const byCategoryMap = new Map();
  const byCompetitorMap = new Map();

  let competitors = 0;
  let stores = 0;
  let products = 0;
  let duplicatesResolved = 0;
  let queensProducts = 0;
  let queensPriced = 0;
  let hasQueens = false;

  let lowest = null;
  let highest = null;

  for (const c of cycles) {
    const s = c.summary;
    mergeCounters(totals, {
      items: s.totals.items,
      recorded: s.totals.recorded,
      missing: s.totals.missing,
      available: s.totals.available,
      outOfStock: s.totals.outOfStock,
      notFound: s.totals.notFound,
    });
    review.APPROVED += s.review.APPROVED || 0;
    review.PENDING += s.review.PENDING || 0;
    review.NEEDS_REVIEW += s.review.NEEDS_REVIEW || 0;
    duplicatesResolved += s.totals.duplicatesResolved || 0;

    competitors = Math.max(competitors, s.totals.competitors);
    stores = Math.max(stores, s.totals.stores);
    products = Math.max(products, s.totals.products);

    if (s.queens) {
      hasQueens = true;
      queensProducts = Math.max(queensProducts, s.queens.products);
      queensPriced += s.queens.priced;
    }

    for (const cat of s.byCategory) {
      const cur = byCategoryMap.get(cat.category) || {
        category: cat.category,
        products: 0,
        items: 0,
        recorded: 0,
        missing: 0,
        available: 0,
        outOfStock: 0,
        notFound: 0,
      };
      cur.products = Math.max(cur.products, cat.products);
      cur.items += cat.items;
      cur.recorded += cat.recorded;
      cur.missing += cat.missing;
      cur.available += cat.available;
      cur.outOfStock += cat.outOfStock;
      cur.notFound += cat.notFound;
      byCategoryMap.set(cat.category, cur);
    }

    for (const comp of s.byCompetitor) {
      const cur = byCompetitorMap.get(comp.competitorKey) || {
        competitorKey: comp.competitorKey,
        competitor: comp.competitor,
        stores: 0,
        items: 0,
        recorded: 0,
        missing: 0,
        available: 0,
        outOfStock: 0,
        notFound: 0,
      };
      cur.stores = Math.max(cur.stores, comp.stores);
      cur.items += comp.items;
      cur.recorded += comp.recorded;
      cur.missing += comp.missing;
      cur.available += comp.available;
      cur.outOfStock += comp.outOfStock;
      cur.notFound += comp.notFound;
      byCompetitorMap.set(comp.competitorKey, cur);
    }

    if (s.priceRange) {
      if (!lowest || s.priceRange.lowest.price < lowest.price) lowest = s.priceRange.lowest;
      if (!highest || s.priceRange.highest.price > highest.price) highest = s.priceRange.highest;
    }
  }

  return {
    totals: {
      competitors,
      stores,
      products,
      ...withCoverage(totals),
      availabilityRatePct: pct(totals.available, totals.recorded),
      duplicatesResolved,
    },
    review,
    queens: hasQueens ? { products: queensProducts, priced: queensPriced } : null,
    byCategory: [...byCategoryMap.values()].map((c) => ({
      category: c.category,
      products: c.products,
      ...withCoverage(c),
    })),
    byCompetitor: [...byCompetitorMap.values()].map((c) => ({
      competitorKey: c.competitorKey,
      competitor: c.competitor,
      stores: c.stores,
      ...withCoverage(c),
    })),
    priceRange: lowest && highest ? { lowest, highest } : null,
    cyclesCount: cycles.length,
  };
};

const buildSection = (
  config,
  {
    observations,
    assignmentItems,
    queensPrices,
    store,
    cycles,
    masterProducts,
  },
) => {
  const cycleBlocks = cycles
    .map((cycle) =>
      buildCycle(config, cycle, {
        observations,
        assignmentItems,
        queensPrices,
        store,
        masterProducts,
      }),
    )
    .filter(Boolean);

  if (cycleBlocks.length === 0) return null;

  const flatCategories = [];
  for (const block of cycleBlocks) {
    for (const cat of block.categories) {
      const existing = flatCategories.find((c) => c.name === cat.name);
      if (existing) {
        for (const prod of cat.products) {
          if (!existing.products.find((p) => p.id === prod.id)) {
            existing.products.push(prod);
          }
        }
      } else {
        flatCategories.push({ name: cat.name, products: [...cat.products] });
      }
    }
  }
  flatCategories.sort((a, b) => byText(a.name, b.name));
  for (const cat of flatCategories) {
    cat.products.sort((a, b) => byText(a.name, b.name));
  }

  const columnShape = cycleBlocks[0].columns;

  return {
    type: config.key,
    label: config.label,
    description: config.description,
    columns: columnShape,
    cycles: cycleBlocks.map((b) => ({
      period: b.cycle,
      label: b.cycle.name,
      columns: b.columns,
      categories: b.categories,
      summary: b.summary,
    })),
    categories: flatCategories,
    summary: aggregateSummaries(cycleBlocks),
  };
};

export const buildReportModel = ({
  period,
  store,
  stores,
  observations,
  assignmentItems,
  queensPrices,
  cycles,
  masterProducts,
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
        cycles,
        masterProducts,
      }),
    )
    .filter(Boolean);

  if (sections.length === 0) {
    const label =
      reportTypes.length === 1
        ? ` (${REPORT_TYPES[reportTypes[0]].label})`
        : "";
    throw new ApiError(
      404,
      stores && stores.length > 1
        ? `No price observations or assignments found for the selected stores and range${label}`
        : store
          ? `No price observations or assignments found for this store in the selected range${label}`
          : `No price observations or assignments found for the selected range${label}`,
    );
  }

  return {
    scope: stores && stores.length > 1 ? "MULTI_STORE" : store ? "STORE" : "ALL_STORES",
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
    stores: (stores || []).map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city ?? null,
      area: s.area ?? null,
      competitorId: s.competitor?.id ?? null,
      competitorName: s.competitor?.name ?? "",
    })),
    sections,
  };
};

const loadReportModel = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
  storeId,
  reportType,
  user,
}) => {
  const requested = normalizeReportType(reportType);
  if (requested === null) {
    throw new ApiError(
      400,
      `reportType must be one of: ${REPORT_TYPE_KEYS.join(", ")} (omit it to get both)`,
    );
  }
  const reportTypes = requested ? [requested] : REPORT_TYPE_KEYS;

  const raw = await loadRawData({
    surveyPeriodId,
    rangeType,
    startDate,
    endDate,
    storeId,
    needsQueens: reportTypes.includes("FRESH_CORNER") || reportTypes.length > 1,
  });

  return buildReportModel({ ...raw, reportTypes, user });
};

const buildFilename = (model, extension) => {
  const parts = ["price-report", slugify(model.period.name)];
  if (model.reportType !== "ALL") {
    parts.push(REPORT_TYPES[model.reportType].slug);
  }
  if (model.store) {
    parts.push(slugify(model.store.name));
  } else if (model.stores && model.stores.length > 1) {
    parts.push(`${model.stores.length}-stores`);
  }
  parts.push(new Date().toISOString().slice(0, 10));
  return `${parts.join("_")}.${extension}`;
};

export const getAiReportSummary = async (params) => {
  const model = await loadReportModel(params);
  const reportType = params.reportType || "ALL";

  const totalProducts = model.sections.reduce(
    (acc, s) => acc + (s.categories?.reduce((cAcc, c) => cAcc + c.products.length, 0) || 0),
    0,
  );

  // ─────────────────────────────────────────────────────────────
  // Build a COMPACT payload for the LLM. We deliberately do NOT
  // send the full product list — with 100+ products × up to 4
  // competitors + Queens, the raw JSON blows past Groq's 8k TPM
  // limit. Instead we send:
  //   • per-section summary totals
  //   • per-cycle totals
  //   • top 5 price gaps (where Queens is most above / below the
  //     cheapest competitor)
  //   • a handful of "not found" highlights
  // ─────────────────────────────────────────────────────────────
  const sectionsPayload = model.sections.map((section) => {
    const competitors = section.columns
      .filter((c) => c.kind === "COMPETITOR")
      .map((c) => c.label);

    const queensColumn = section.columns.find((c) => c.kind === "QUEENS");

    // Gather products with a Queens price AND at least one competitor
    // price, then rank by price gap.
    const ranked = [];
    for (const cat of section.categories) {
      for (const prod of cat.products) {
        const queensCell = queensColumn ? prod.cells?.[queensColumn.key] : null;
        if (!queensCell || queensCell.price === null || queensCell.price === undefined) {
          continue;
        }
        const competitorPrices = section.columns
          .filter((c) => c.kind === "COMPETITOR")
          .map((c) => prod.cells?.[c.key])
          .filter(
            (rec) => rec && rec.availability === "AVAILABLE" && rec.price !== null,
          )
          .map((rec) => Number(rec.price));

        if (competitorPrices.length === 0) continue;

        const cheapest = Math.min(...competitorPrices);
        const queens = Number(queensCell.price);
        const gap = queens - cheapest;
        const gapPct = cheapest > 0 ? (gap / cheapest) * 100 : 0;

        ranked.push({
          category: cat.name,
          name: prod.name,
          unit: prod.unit || "",
          queensPrice: queens,
          cheapestCompetitor: cheapest,
          cheapestCompetitorName: section.columns.find((c) => {
            const rec = prod.cells?.[c.key];
            return (
              c.kind === "COMPETITOR" &&
              rec &&
              rec.availability === "AVAILABLE" &&
              Number(rec.price) === cheapest
            );
          })?.label || "",
          gapETB: Math.round(gap * 100) / 100,
          gapPct: Math.round(gapPct * 10) / 10,
        });
      }
    }

    const overpriced = [...ranked].sort((a, b) => b.gapPct - a.gapPct).slice(0, 5);
    const underpriced = [...ranked].sort((a, b) => a.gapPct - b.gapPct).slice(0, 5);

    // Not-found highlights: products where every competitor column is
    // "Not found" this cycle. Useful for the AI to spot assortment gaps.
    const notFoundHighlights = [];
    for (const cat of section.categories) {
      for (const prod of cat.products) {
        const anyAvailable = section.columns
          .filter((c) => c.kind === "COMPETITOR")
          .some((c) => {
            const rec = prod.cells?.[c.key];
            return rec && rec.availability === "AVAILABLE";
          });
        if (!anyAvailable) {
          notFoundHighlights.push({
            category: cat.name,
            name: prod.name,
          });
          if (notFoundHighlights.length >= 8) break;
        }
      }
      if (notFoundHighlights.length >= 8) break;
    }

    return {
      sectionType: section.type,
      label: section.label,
      competitors,
      totals: section.summary?.totals,
      cycles: section.cycles.map((c) => ({
        cycleLabel: c.label,
        totals: c.summary?.totals,
      })),
      overpricedHighlights: overpriced,
      underpricedHighlights: underpriced,
      notFoundHighlights,
    };
  });

  const contextJson = JSON.stringify(
    {
      timeframe: model.period.name,
      range: {
        startDate: model.period.startDate,
        endDate: model.period.endDate,
      },
      reportScope: reportType,
      sections: sectionsPayload,
    },
    null,
    2,
  );

  let prompt = "";
  if (reportType === "FRESH_CORNER") {
    prompt = `
You are the Chief Fresh Produce Pricing Strategist for Queens Supermarket PLC / Carrefour Ethiopia.
Generate a decisive C-level executive pricing brief for this produce period (${model.period.name}):

Market Intelligence Context:
${contextJson}

Structure your report into these exact sections:
1. Executive Summary & Morning Sourcing Realities (Garment wholesale vs Fresh Corner retail)
2. Critical Cost Floor Warnings (Lame Dairy & ELFORA Ex-Factory gates vs Queen's shelf prices)
3. Immediate Margin Optimization & Price Directives (Identify overpriced vs underpriced produce)
4. Out-of-Stock Action Plan & Produce Sourcing Recommendations

Tone: Decisive, urgent, operational, referencing exact Ethiopian Birr (ETB) figures and competitor discrepancies.
`;
  } else if (reportType === "ULTRA_SENSITIVE") {
    prompt = `
You are the Lead Commercial Pricing Intelligence Director for Queens Supermarket PLC / MIDROC Investment Group.
Generate a structured C-level executive pricing brief for this FMCG benchmarking window (${model.period.name}):

Market Intelligence Context:
${contextJson}

Structure your report into these exact sections:
1. Executive Summary & Carrefour 95% FMCG Parity Index Compliance
2. Competitor Price Drift & Market Threats (Shoa, Abadir, Allmart, Bambis)
3. Immediate Margin Recovery & Upward Adjustment Windows
4. Strategic Positioning & Promotion Directives for Upcoming Trading Window

Tone: Corporate, analytical, C-suite grade. Mention specific margin opportunities.
`;
  } else {
    prompt = `
You are the Chief Commercial Officer & Head of Retail Pricing for Queens Supermarket PLC / MIDROC Investment Group.
Generate an integrated comprehensive executive pricing intelligence brief for both **Daily Fresh Produce** and **100 Ultra-Sensitive FMCG** across this timeframe (${model.period.name}):

Market Intelligence Context:
${contextJson}

Structure your report into these exact sections:
1. Executive Summary & Overall Price Competitiveness Index
2. Daily Fresh Produce Realities (Fresh Corner, Garment wholesale vs Queen's shelf benchmark)
3. FMCG Core Parity Analysis (Shoa, Abadir, Allmart, Bambis vs Carrefour 95% target)
4. Immediate Margin Recovery Directives (Overpriced vs underpriced items)
5. Availability, Stockouts & Strategic Supply Recommendations

Tone: Highly authoritative, executive-grade retail intelligence. Use ETB figures and concrete competitor comparisons.
`;
  }

  const activeModel = await getActiveGroqModel("reasoning");

  // Guard: keep the final prompt under ~6000 tokens so it never
  // trips Groq's 8000 TPM limit. If it's still too big, cut the
  // notFound highlights first, then the underpriced/overpriced tail.
  const roughTokenCount = Math.ceil(prompt.length / 4);
  let finalPrompt = prompt;
  if (roughTokenCount > 6000) {
    // Fallback: send only totals + competitor lists, no product rows
    const minimalPayload = JSON.stringify(
      {
        timeframe: model.period.name,
        reportScope: reportType,
        sections: model.sections.map((section) => ({
          sectionType: section.type,
          label: section.label,
          competitors: section.columns
            .filter((c) => c.kind === "COMPETITOR")
            .map((c) => c.label),
          totals: section.summary?.totals,
          cycles: section.cycles.map((c) => ({
            cycleLabel: c.label,
            totals: c.summary?.totals,
          })),
        })),
      },
      null,
      2,
    );
    finalPrompt = prompt.replace(contextJson, minimalPayload);
  }

  const completion = await groq.chat.completions.create({
    model: activeModel,
    messages: [
      { role: "system", content: "You write high-level corporate retail pricing briefs." },
      { role: "user", content: finalPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const narrative = completion.choices[0].message.content;

  return {
    reportType,
    rangeType: params.rangeType || (params.surveyPeriodId ? "PERIOD" : "CUSTOM"),
    totalProducts,
    period: model.period,
    generatedAt: new Date(),
    narrative,
    sections: model.sections,
  };
};

export const generateAiObservationReportDocx = async (params) => {
  const model = await loadReportModel(params);
  const { narrative } = await getAiReportSummary(params);
  const reportType = params.reportType || "ALL";

  const buffer = await buildObservationReportDocx({
    model,
    aiNarrative: narrative,
    reportType,
  });

  const periodSlug = slugify(model.period.name);
  const typeSlug = reportType.toLowerCase().replace(/_/g, "-");
  const filename = `Queens_AI_Pricing_Report_${typeSlug}_${periodSlug}_${new Date().toISOString().slice(0, 10)}.docx`;

  return {
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
};

export const getObservationReportSummary = async (params) => {
  const model = await loadReportModel(params);
  return {
    scope: model.scope,
    reportType: model.reportType,
    generatedAt: model.generatedAt,
    period: model.period,
    store: model.store,
    stores: model.stores,
    sections: model.sections.map((section) => ({
      type: section.type,
      label: section.label,
      description: section.description,
      columns: section.columns,
      summary: section.summary,
      cycles: section.cycles.map((c) => ({
        periodId: c.period.id,
        label: c.label,
        status: c.period.status,
        startDate: c.period.startDate,
        endDate: c.period.endDate,
        summary: c.summary,
      })),
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
  getAiReportSummary,
  generateAiObservationReportDocx,
};