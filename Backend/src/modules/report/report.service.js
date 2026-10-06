import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { buildObservationReportPdf } from "./report.pdf.js";
import { buildObservationReportExcel } from "./report.excel.js";
import { groq, getActiveGroqModel } from "../../config/groq.js";
import { buildObservationReportDocx } from "./report.docx.js";
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
// In Backend/src/modules/report/report.service.js

const resolveDateRange = async ({ surveyPeriodId, rangeType, startDate, endDate }) => {
  const now = new Date();

  // 1. Explicit Week Range
  if (rangeType === "WEEK") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return {
      startDate: start,
      endDate: now,
      periodName: `Past 7 Days (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
      periodId: "range-week",
      isDateBoundOnly: true,
    };
  }

  // 2. Explicit Month Range
  if (rangeType === "MONTH") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return {
      startDate: start,
      endDate: now,
      periodName: `Past 30 Days (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
      periodId: "range-month",
      isDateBoundOnly: true,
    };
  }

  // 3. Custom Date Range
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (String(endDate).length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      return {
        startDate: start,
        endDate: end,
        periodName: `Custom Range (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
        periodId: "range-custom",
        isDateBoundOnly: true,
      };
    }
  }

  // 4. Any Specific Survey Period (OPEN, CLOSED, or DRAFT)
  if (surveyPeriodId && surveyPeriodId !== "ALL" && surveyPeriodId !== "all") {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id: surveyPeriodId },
    });
    if (!period) throw new ApiError(404, `Survey period '${surveyPeriodId}' not found`);
    return {
      startDate: period.startDate,
      endDate: period.endDate,
      periodName: `${period.name}${period.status ? ` (${period.status})` : ""}`,
      periodId: period.id,
      periodRecord: period,
      isDateBoundOnly: false,
    };
  }

  // 5. Automatic Fallback: Latest active open period, or latest closed period
  const latestPeriod =
    (await prisma.surveyPeriod.findFirst({
      where: { status: "OPEN" },
      orderBy: { startDate: "desc" },
    })) ||
    (await prisma.surveyPeriod.findFirst({
      orderBy: { startDate: "desc" },
    }));

  if (latestPeriod) {
    return {
      startDate: latestPeriod.startDate,
      endDate: latestPeriod.endDate,
      periodName: `${latestPeriod.name}${latestPeriod.status ? ` (${latestPeriod.status})` : ""}`,
      periodId: latestPeriod.id,
      periodRecord: latestPeriod,
      isDateBoundOnly: false,
    };
  }

  return {
    startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    endDate: now,
    periodName: "All Survey Data",
    periodId: "all-data",
    isDateBoundOnly: true,
  };
};

const loadRawData = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
  storeId,
  needsQueens,
}) => {
  const rangeInfo = await resolveDateRange({ surveyPeriodId, rangeType, startDate, endDate });

  const store = storeId
    ? await prisma.store.findUnique({
      where: { id: storeId },
      select: STORE_SELECT,
    })
    : null;

  if (storeId && !store) throw new ApiError(404, "Store not found");

  const period = rangeInfo.periodRecord || {
    id: rangeInfo.periodId,
    name: rangeInfo.periodName,
    startDate: rangeInfo.startDate,
    endDate: rangeInfo.endDate,
    status: rangeInfo.periodRecord?.status || "OPEN",
  };

  // Build the observation filter
  const observationWhere = {
    audit: {
      status: { notIn: EXCLUDED_AUDIT_STATUSES },
      ...(storeId ? { storeId } : {}),
    },
    reviewStatus: { notIn: EXCLUDED_REVIEW_STATUSES },
  };

  if (rangeInfo.periodRecord) {
    // Exact survey period binding (OPEN or CLOSED) — no date cutoff
    observationWhere.audit.surveyPeriodId = rangeInfo.periodRecord.id;
  } else if (rangeInfo.isDateBoundOnly) {
    // Pure date range filtering
    observationWhere.capturedAt = {
      gte: rangeInfo.startDate,
      lte: rangeInfo.endDate,
    };
  }

  // Build the assignment items filter
  const assignmentWhere = {
    assignment: {
      status: { not: "CANCELLED" },
      ...(storeId ? { storeId } : {}),
    },
  };

  if (rangeInfo.periodRecord) {
    assignmentWhere.assignment.surveyPeriodId = rangeInfo.periodRecord.id;
  } else if (rangeInfo.isDateBoundOnly) {
    assignmentWhere.assignment.surveyPeriod = {
      startDate: { lte: rangeInfo.endDate },
      endDate: { gte: rangeInfo.startDate },
    };
  }

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
        audit: { select: { id: true, store: { select: STORE_SELECT } } },
      },
    }),
    prisma.assignmentItem.findMany({
      where: assignmentWhere,
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


const buildSection = (config, { observations, assignmentItems, queensPrices, store }) => {
  let columns = config.columns;

  if (store) {
    const storeColumn = matchColumn(columns, store.competitor?.name);
    if (!storeColumn) return null;
    columns = columns.filter((c) => c.kind === "QUEENS" || c.key === storeColumn.key);
  }

  const competitorColumns = columns.filter((c) => c.kind === "COMPETITOR");
  const queensColumn = columns.find((c) => c.kind === "QUEENS") || null;

  const productsMap = new Map();
  const pairs = new Map();
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

  for (const item of assignmentItems) {
    const column = matchColumn(competitorColumns, item.assignment.store?.competitor?.name);
    if (!column || !config.acceptsCategory(categoryOf(item.product))) continue;

    columnStores.get(column.key).add(item.assignment.storeId);
    registerProduct(item.product);
    getPair(column.key, item.productId);
  }

  for (const obs of observations) {
    const obsStore = obs.audit.store;
    const column = matchColumn(competitorColumns, obsStore?.competitor?.name);
    if (!column || !config.acceptsCategory(categoryOf(obs.product))) continue;

    columnStores.get(column.key).add(obsStore.id);
    registerProduct(obs.product);
    getPair(column.key, obs.productId).observations.push(obs);
  }

  if (pairs.size === 0) return null;

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

  const totalCounters = blankCounters();
  const categoryCounters = new Map(categories.map((c) => [c.name, blankCounters()]));
  const columnCounters = new Map(competitorColumns.map((c) => [c.key, blankCounters()]));
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
      if (pair.record.availability === "AVAILABLE" && pair.record.price !== null) {
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
      reportTypes.length === 1
        ? ` (${REPORT_TYPES[reportTypes[0]].label})`
        : "";
    throw new ApiError(
      404,
      store
        ? `No price observations or assignments found for this store in the selected range${label}`
        : `No price observations or assignments found for the selected range${label}`,
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
  rangeType,
  startDate,
  endDate,
  storeId,
  reportType,
  user,
}) => {
  const cleanPeriodId = surveyPeriodId ? String(surveyPeriodId).trim() : undefined;
  const cleanStoreId = storeId ? String(storeId).trim() : undefined;

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
    rangeType,
    startDate,
    endDate,
    storeId: cleanStoreId,
    needsQueens: reportTypes.includes("FRESH_CORNER") || reportTypes.length > 1,
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

export const getAiReportSummary = async (params) => {
  const model = await loadReportModel(params);
  const reportType = params.reportType || "ALL";

  const totalProducts = model.sections.reduce(
    (acc, s) => acc + (s.categories?.reduce((cAcc, c) => cAcc + c.products.length, 0) || 0),
    0,
  );

  const sectionsPayload = model.sections.map((section) => ({
    sectionType: section.type,
    label: section.label,
    competitors: section.columns.filter((c) => c.kind === "COMPETITOR").map((c) => c.label),
    totals: section.summary?.totals,
    sampleHighlights: section.categories.flatMap((cat) =>
      cat.products.slice(0, 10).map((prod) => ({
        category: cat.name,
        name: prod.name,
        unit: prod.unit,
        prices: prod.cells,
      })),
    ),
  }));

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

  const completion = await groq.chat.completions.create({
    model: activeModel,
    messages: [
      { role: "system", content: "You write high-level corporate retail pricing briefs." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
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
  getAiReportSummary,
  generateAiObservationReportDocx,
};