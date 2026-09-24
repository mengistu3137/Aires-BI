import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  calculateCompetitorAggregates,
  calculatePriceIndex,
  getTargetIndex,
  determinePriceAction,
  formatPriceAnalysisResponse,
  PRICE_ANALYSIS_CONFIG,
} from "./price-analysis.helper.js";
import { alertService } from "../alerts/alert.service.js";
import ExcelJS from "exceljs";

const ANALYSIS_INCLUDE_RELATIONS = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      category: true,
      unit: true,
    },
  },
  surveyPeriod: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
};

/**
 * Fetches APPROVED competitor prices for each (productId, surveyPeriodId)
 * pair in the given analysis records. Returns a Map keyed by productId.
 *
 * Only observations with availability AVAILABLE, price > 0, and reviewStatus
 * APPROVED are included — matching the same filter that feeds the analysis
 * calculation.
 *
 * @param {Array<{ productId: string, surveyPeriodId: string }>} analyses
 * @returns {Promise<Map<string, Array<{ storeName: string, storeId: string, price: number, capturedAt: Date }>>>}
 */
const fetchApprovedCompetitorPrices = async (analyses) => {
  const productIds = [...new Set(analyses.map((a) => a.productId))];
  const surveyPeriodId = analyses[0]?.surveyPeriodId;

  if (productIds.length === 0 || !surveyPeriodId) {
    return new Map();
  }

  const observations = await prisma.priceObservation.findMany({
    where: {
      productId: { in: productIds },
      audit: { surveyPeriodId },
      availability: "AVAILABLE",
      price: { not: null, gt: 0 },
      reviewStatus: "APPROVED",
    },
    select: {
      id: true,
      productId: true,
      price: true,
      capturedAt: true,
      audit: {
        select: {
          storeId: true,
          store: {
            select: {
              id: true,
              name: true,
              area: true,
              competitor: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { capturedAt: "desc" },
  });

  // Group by productId. If a product has multiple approved observations from
  // the same store, keep the latest one (the query is already sorted desc).
  const byProduct = new Map();
  const seenKeys = new Set();

  for (const obs of observations) {
    if (!byProduct.has(obs.productId)) {
      byProduct.set(obs.productId, []);
    }
    const storeId = obs.audit?.storeId;
    const dedupeKey = `${obs.productId}::${storeId}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    byProduct.get(obs.productId).push({
      observationId: obs.id,
      storeId,
      storeName: obs.audit?.store?.name || "Unknown store",
      competitorName: obs.audit?.store?.competitor?.name || null,
      area: obs.audit?.store?.area || null,
      price: Number(obs.price),
      capturedAt: obs.capturedAt,
    });
  }

  // Sort each product's competitor list by store name for consistent display
  for (const [, list] of byProduct) {
    list.sort((a, b) => (a.storeName || "").localeCompare(b.storeName || ""));
  }

  return byProduct;
};

/**
 * Formats an analysis record and attaches the approved competitor prices
 * for that product/period.
 */
const formatAnalysisWithCompetitors = (analysis, competitorMap) => {
  const base = formatPriceAnalysisResponse(analysis);
  const competitors = competitorMap.get(analysis.productId) || [];

  return {
    ...base,
    competitorPrices: competitors,
  };
};

/**
 * Resolves the historical Queens benchmark price for a given product and survey period.
 *
 * Strategy:
 *   1. Prefer the benchmark effective on the period's startDate (strict historical reference).
 *   2. If none exists, fall back to the most recent benchmark that was effective
 *      at any point during or before the period's endDate. This handles cases
 *      where the benchmark was created after the period started — a common
 *      operational pattern.
 */
export const resolveBenchmarkForSurveyPeriod = async (
  productId,
  surveyPeriod,
) => {
  const startDate = new Date(surveyPeriod.startDate);
  const endDate = new Date(surveyPeriod.endDate);

  // 1. Strict historical: benchmark effective at start of period
  let benchmark = await prisma.queensPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: startDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: startDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (benchmark) return benchmark;

  // 2. Fallback: most recent benchmark effective before the period ended
  benchmark = await prisma.queensPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: endDate },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return benchmark || null;
};

/**
 * Creates or updates a PriceAnalysis record for a specific Product and SurveyPeriod.
 * Idempotent via @@unique([productId, surveyPeriodId]).
 */
export const calculateProductAnalysis = async ({
  productId,
  surveyPeriodId,
  notes = null,
}) => {
  // 1. Verify Product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, `Product [${productId}] not found`);
  }

  // 2. Verify SurveyPeriod exists
  const surveyPeriod = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
  });

  if (!surveyPeriod) {
    throw new ApiError(404, `SurveyPeriod [${surveyPeriodId}] not found`);
  }

  // 3. Resolve historical Queens benchmark price
  const benchmark = await resolveBenchmarkForSurveyPeriod(
    productId,
    surveyPeriod,
  );
  if (!benchmark) {
    throw new ApiError(
      422,
      `No Queens benchmark price found for product "${product.name}" (${productId}) covering survey period "${surveyPeriod.name}" (${surveyPeriod.startDate.toISOString()} → ${surveyPeriod.endDate.toISOString()}). Create a Queens price effective before ${surveyPeriod.startDate.toISOString().slice(0, 10)}.`,
    );
  }

  // 4. Retrieve valid, approved competitor observations belonging to this survey period
  const observations = await prisma.priceObservation.findMany({
    where: {
      productId,
      audit: {
        surveyPeriodId,
      },
      availability: "AVAILABLE",
      price: { not: null, gt: 0 },
      // Analytical data integrity: only APPROVED observations are included in pricing calculations
      reviewStatus: "APPROVED",
    },
    select: {
      price: true,
    },
  });

  const observedPrices = observations.map((o) => o.price);

  // 5. Aggregate competitor prices
  const { minimumCompetitorPrice, competitorAveragePrice, count } =
    calculateCompetitorAggregates(observedPrices);

  // 6. Compute Price Index
  const priceIndex = competitorAveragePrice
    ? calculatePriceIndex(benchmark.price, competitorAveragePrice)
    : null;

  // 7. Resolve Target Index
  const targetIndex = getTargetIndex(product);

  // 8. Determine Action
  const action = determinePriceAction({
    priceIndex,
    targetIndex,
    observationCount: count,
  });

  const analysisNotes = notes
    ? notes.trim()
    : count === 0
      ? "No approved competitor observations found for this survey period."
      : null;

  // 9. Atomic Upsert via unique composite key
  const analysis = await prisma.priceAnalysis.upsert({
    where: {
      productId_surveyPeriodId: {
        productId,
        surveyPeriodId,
      },
    },
    create: {
      productId,
      surveyPeriodId,
      queensPrice: benchmark.price,
      minimumCompetitorPrice,
      competitorAveragePrice,
      priceIndex,
      targetIndex,
      action,
      calculatedAt: new Date(),
      notes: analysisNotes,
    },
    update: {
      queensPrice: benchmark.price,
      minimumCompetitorPrice,
      competitorAveragePrice,
      priceIndex,
      targetIndex,
      action,
      calculatedAt: new Date(),
      notes: analysisNotes,
    },
    include: ANALYSIS_INCLUDE_RELATIONS,
  });

  // Clean Alert Trigger hook: evaluate alert asynchronously/safely without breaking analysis response
  try {
    await alertService.createAlertFromPriceAnalysis(analysis.id);
  } catch (alertErr) {
    console.error(
      `[Alert Hook] Failed to evaluate alert for analysis ${analysis.id}:`,
      alertErr.message,
    );
  }

  return formatPriceAnalysisResponse(analysis);
};

/**
 * Batch generates or recalculates analysis for all assigned products within a survey period.
 */
export const recalculateSurveyPeriodAnalysis = async (surveyPeriodId) => {
  const surveyPeriod = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
    include: {
      assignments: {
        include: {
          items: {
            select: { productId: true },
          },
        },
      },
    },
  });

  if (!surveyPeriod) {
    throw new ApiError(404, `SurveyPeriod [${surveyPeriodId}] not found`);
  }

  // Extract distinct product IDs assigned in this survey period
  const productIds = new Set();
  for (const assignment of surveyPeriod.assignments) {
    for (const item of assignment.items) {
      productIds.add(item.productId);
    }
  }

  if (productIds.size === 0) {
    return {
      surveyPeriodId,
      processedCount: 0,
      analyses: [],
      errors: [],
    };
  }

  const results = [];
  const errors = [];

  for (const productId of productIds) {
    try {
      const res = await calculateProductAnalysis({
        productId,
        surveyPeriodId,
      });
      results.push(res);
    } catch (err) {
      errors.push({
        productId,
        message: err.message,
      });
    }
  }

  return {
    surveyPeriodId,
    totalAssignedProducts: productIds.size,
    processedCount: results.length,
    failedCount: errors.length,
    analyses: results,
    errors,
  };
};

/**
 * Get a single PriceAnalysis record by ID.
 */
export const getPriceAnalysisById = async (id) => {
  const analysis = await prisma.priceAnalysis.findUnique({
    where: { id },
    include: ANALYSIS_INCLUDE_RELATIONS,
  });

  if (!analysis) {
    throw new ApiError(404, "Price Analysis record not found");
  }

  const competitorMap = await fetchApprovedCompetitorPrices([analysis]);
  return formatAnalysisWithCompetitors(analysis, competitorMap);
};

/**
 * Get a single PriceAnalysis record by productId and surveyPeriodId.
 */
export const getProductSurveyPeriodAnalysis = async (
  productId,
  surveyPeriodId,
) => {
  const analysis = await prisma.priceAnalysis.findUnique({
    where: {
      productId_surveyPeriodId: { productId, surveyPeriodId },
    },
    include: ANALYSIS_INCLUDE_RELATIONS,
  });

  if (!analysis) {
    throw new ApiError(
      404,
      `No Price Analysis found for product [${productId}] in survey period [${surveyPeriodId}]`,
    );
  }

  const competitorMap = await fetchApprovedCompetitorPrices([analysis]);
  return formatAnalysisWithCompetitors(analysis, competitorMap);
};

/**
 * List Price Analyses with filtering and pagination.
 */
export const listPriceAnalyses = async (query = {}) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 20,
    surveyPeriodId,
    productId,
    action,
    category,
    from,
    to,
  } = query;

  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(rawLimit, 10) || 20));

  const where = {};

  if (surveyPeriodId) where.surveyPeriodId = surveyPeriodId;
  if (productId) where.productId = productId;
  if (action) where.action = action;

  if (category) {
    where.product = { ...(where.product || {}), category };
  }

  if (from || to) {
    where.calculatedAt = {};
    if (from) where.calculatedAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      where.calculatedAt.lte = toDate;
    }
  }

  const skip = (page - 1) * limit;

  const [total, records] = await prisma.$transaction([
    prisma.priceAnalysis.count({ where }),
    prisma.priceAnalysis.findMany({
      where,
      skip,
      take: limit,
      orderBy: { calculatedAt: "desc" },
      include: ANALYSIS_INCLUDE_RELATIONS,
    }),
  ]);

  // Attach approved competitor prices for all analyses on this page
  const competitorMap = await fetchApprovedCompetitorPrices(records);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: records.map((r) => formatAnalysisWithCompetitors(r, competitorMap)),
    meta: { page, limit, total, totalPages },
  };
};

/**
 * Builds an .xlsx buffer for every PriceAnalysis record.
 *
 * Optional filter: surveyPeriodId
 *
 * Includes:
 *   - A "Report Info" sheet with metadata
 *   - A "Price Analysis" sheet with one row per product and
 *     one column per store, plus Min / Avg / Index / Target / Action.
 *
 * Only APPROVED competitor observations are included — matching the
 * same filter that feeds the analysis calculation.
 */
export const generatePriceAnalysisExcel = async ({ surveyPeriodId } = {}) => {
  // 1. Load the survey period (for metadata + filename)
  const surveyPeriod = surveyPeriodId
    ? await prisma.surveyPeriod.findUnique({
        where: { id: surveyPeriodId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      })
    : null;

  // 2. Load all analyses for the period (or all periods if none specified)
  const where = {};
  if (surveyPeriodId) where.surveyPeriodId = surveyPeriodId;

  const analyses = await prisma.priceAnalysis.findMany({
    where,
    orderBy: { calculatedAt: "desc" },
    include: ANALYSIS_INCLUDE_RELATIONS,
  });

  if (analyses.length === 0) {
    throw new ApiError(404, "No price analysis records to export");
  }

  // 3. Fetch approved competitor prices for all products
  const competitorMap = await fetchApprovedCompetitorPrices(analyses);

  // 4. Discover store columns across all analyses
  const storeMap = new Map();
  for (const [, list] of competitorMap) {
    for (const cp of list) {
      if (cp.storeId && !storeMap.has(cp.storeId)) {
        storeMap.set(cp.storeId, {
          storeId: cp.storeId,
          storeName: cp.storeName || "Unknown store",
          competitorName: cp.competitorName || null,
        });
      }
    }
  }
  const storeColumns = [...storeMap.values()].sort((a, b) =>
    (a.storeName || "").localeCompare(b.storeName || ""),
  );

  // 5. Build the workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Aires-BI";
  workbook.created = new Date();

  // ────────────────────────────────────────────────────────────
  // Color system — one palette shared by both sheets
  // ────────────────────────────────────────────────────────────
  const PALETTE = {
    brandDark: "FF063970", // navy — title banner / header fill
    brandTeal: "FFD9A441", // warm gold — accent bars / borders (pairs with navy)
    brandTealLight: "FFDCEAF7", // light navy tint — legend section headers
    headerBg: "FF063970", // navy — table header fill
    headerBorder: "FFD9A441", // gold — header underline
    white: "FFFFFFFF",
    bandEven: "FFFFFFFF",
    bandOdd: "FFF8FAFC", // slate-50
    gridLine: "FFE2E8F0", // slate-200
    labelText: "FF334155", // slate-700
    mutedText: "FF94A3B8", // slate-400
    queensFill: "FFFEF3C7", // amber-100 — benchmark price
    queensText: "FF92400E", // amber-800
    minFill: "FFECFDF5", // emerald-50
    minText: "FF047857", // emerald-700
    avgFill: "FFEFF6FF", // blue-50
    avgText: "FF1D4ED8", // blue-700
    targetFill: "FFF1F5F9", // slate-100
    targetText: "FF475569", // slate-600
  };

  // Semantic scales — kept apart so meaning stays consistent across sheets
  const INDEX_SCALE = {
    good: { bg: "FFD1FAE5", text: "FF065F46" }, // emerald — on target
    warn: { bg: "FFFEF3C7", text: "FF92400E" }, // amber — drifting
    bad: { bg: "FFFEE2E2", text: "FF991B1B" }, // red — off target
    neutral: { bg: "FFF1F5F9", text: "FF64748B" }, // slate — n/a
  };

  const ACTION_SCALE = {
    KEEP: { bg: "FFD1FAE5", text: "FF065F46", label: "Keep" },
    PRICE_DOWN: { bg: "FFFFEDD5", text: "FF9A3412", label: "Price Down" },
    PRICE_UP: { bg: "FFDBEAFE", text: "FF1E40AF", label: "Price Up" },
    REVIEW: { bg: "FFFEE2E2", text: "FF991B1B", label: "Review" },
    DEFAULT: { bg: "FFF1F5F9", text: "FF475569", label: "—" },
  };

  const thinGrid = {
    top: { style: "thin", color: { argb: PALETTE.gridLine } },
    left: { style: "thin", color: { argb: PALETTE.gridLine } },
    bottom: { style: "thin", color: { argb: PALETTE.gridLine } },
    right: { style: "thin", color: { argb: PALETTE.gridLine } },
  };

  const fillCell = (cell, argb) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  };

  // ────────────────────────────────────────────────────────────
  // Sheet 1 — Report Info
  // ────────────────────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet("Report Info", {
    properties: { tabColor: { argb: PALETTE.brandTeal } },
  });
  infoSheet.columns = [
    { key: "field", width: 24 },
    { key: "value", width: 50 },
  ];

  // Title banner (merged, dark navy, teal accent underline)
  infoSheet.mergeCells("A1:B1");
  const titleCell = infoSheet.getCell("A1");
  titleCell.value = "Price Analysis Report";
  titleCell.font = { bold: true, size: 16, color: { argb: PALETTE.white } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  fillCell(titleCell, PALETTE.brandDark);
  infoSheet.getRow(1).height = 32;
  infoSheet.getCell("A1").border = {
    bottom: { style: "medium", color: { argb: PALETTE.brandTeal } },
  };
  infoSheet.getCell("B1").border = {
    bottom: { style: "medium", color: { argb: PALETTE.brandTeal } },
  };
  fillCell(infoSheet.getCell("B1"), PALETTE.brandDark);

  infoSheet.addRow(["", ""]); // spacer

  const infoRows = [
    ["Survey Period", surveyPeriod?.name || "All survey periods"],
    ["Period ID", surveyPeriod?.id || "—"],
    [
      "Period Dates",
      surveyPeriod
        ? `${new Date(surveyPeriod.startDate).toISOString().slice(0, 10)} → ${new Date(surveyPeriod.endDate).toISOString().slice(0, 10)}`
        : "—",
    ],
    ["Period Status", surveyPeriod?.status || "—"],
    ["Generated At", new Date().toISOString()],
    ["Total Products", analyses.length],
    ["Total Columns", 4 + storeColumns.length + 6],
  ];

  infoRows.forEach(([field, value], i) => {
    const row = infoSheet.addRow({ field, value });
    row.height = 20;
    const bandArgb = i % 2 === 0 ? PALETTE.bandOdd : PALETTE.bandEven;
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(2);
    fillCell(labelCell, bandArgb);
    fillCell(valueCell, bandArgb);
    labelCell.font = { bold: true, color: { argb: PALETTE.labelText } };
    valueCell.font = { color: { argb: PALETTE.labelText } };
    labelCell.alignment = { vertical: "middle", indent: 1 };
    valueCell.alignment = { vertical: "middle", indent: 1 };
    labelCell.border = thinGrid;
    valueCell.border = thinGrid;
  });

  // ────────────────────────────────────────────────────────────
  // Sheet 2 — Price Analysis
  // ────────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet("Price Analysis", {
    properties: { tabColor: { argb: PALETTE.brandDark } },
  });

  // Column definitions
  sheet.columns = [
    { header: "Product", key: "product", width: 32 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Category", key: "category", width: 18 },
    { header: "Queens Price (ETB)", key: "queens", width: 18 },
    ...storeColumns.map((s) => ({
      header: s.competitorName
        ? `${s.storeName} (${s.competitorName})`
        : s.storeName,
      key: `store_${s.storeId}`,
      width: 22,
    })),
    { header: "Min Competitor (ETB)", key: "min", width: 20 },
    { header: "Avg Competitor (ETB)", key: "avg", width: 20 },
    { header: "Price Index", key: "index", width: 14 },
    { header: "Target Index", key: "target", width: 14 },
    { header: "Action", key: "action", width: 16 },
    { header: "Calculated", key: "calculated", width: 20 },
  ];

  const totalCols = sheet.columns.length;
  const colIndexByKey = {};
  sheet.columns.forEach((col, idx) => {
    colIndexByKey[col.key] = idx + 1;
  });

  // Style the header row — dark banner with a teal underline for contrast
  const headerRow = sheet.getRow(1);
  headerRow.height = 26;
  for (let c = 1; c <= totalCols; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: PALETTE.white }, size: 11 };
    fillCell(cell, PALETTE.headerBg);
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      ...thinGrid,
      bottom: { style: "medium", color: { argb: PALETTE.headerBorder } },
    };
  }

  // Freeze header row + the first three identifying columns
  sheet.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];

  // Populate data rows
  for (const a of analyses) {
    const cpList = competitorMap.get(a.productId) || [];
    const priceByStore = new Map(cpList.map((cp) => [cp.storeId, cp.price]));

    const row = {
      product: a.product?.name || "",
      sku: a.product?.sku || "",
      category: a.product?.category || "",
      queens: a.queensPrice !== null ? Number(a.queensPrice) : null,
      min:
        a.minimumCompetitorPrice !== null
          ? Number(a.minimumCompetitorPrice)
          : null,
      avg:
        a.competitorAveragePrice !== null
          ? Number(a.competitorAveragePrice)
          : null,
      index: a.priceIndex !== null ? Number(a.priceIndex) : null,
      target: a.targetIndex !== null ? Number(a.targetIndex) : null,
      action: a.action || "",
      calculated: a.calculatedAt
        ? new Date(a.calculatedAt).toISOString().slice(0, 19).replace("T", " ")
        : "",
    };

    for (const s of storeColumns) {
      const v = priceByStore.get(s.storeId);
      row[`store_${s.storeId}`] =
        v !== undefined && v !== null ? Number(v) : null;
    }

    sheet.addRow(row);
  }

  const numericKeys = [
    "queens",
    "min",
    "avg",
    "index",
    "target",
    ...storeColumns.map((s) => `store_${s.storeId}`),
  ];

  // ── Pass 1: base zebra striping + grid lines across every data cell ──
  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const bandArgb = rowIdx % 2 === 0 ? PALETTE.bandOdd : PALETTE.bandEven;
    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(rowIdx, c);
      fillCell(cell, bandArgb);
      cell.border = thinGrid;
      cell.font = { color: { argb: PALETTE.labelText } };
    }
  }

  // ── Pass 2: numeric formatting + right alignment (store/min/avg/etc.) ──
  for (const key of numericKeys) {
    const colIdx = colIndexByKey[key];
    if (!colIdx) continue;

    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const cell = sheet.getCell(rowIdx, colIdx);
      cell.alignment = { horizontal: "right" };
      if (cell.value === null) {
        cell.value = "—";
        cell.font = { color: { argb: PALETTE.mutedText }, italic: true };
      } else {
        cell.numFmt = "#,##0.00";
      }
    }
  }

  // ── Pass 3: semantic highlight fills for benchmark / min / avg / target ──
  const semanticColumns = [
    { key: "queens", bg: PALETTE.queensFill, text: PALETTE.queensText },
    { key: "min", bg: PALETTE.minFill, text: PALETTE.minText },
    { key: "avg", bg: PALETTE.avgFill, text: PALETTE.avgText },
    { key: "target", bg: PALETTE.targetFill, text: PALETTE.targetText },
  ];
  for (const { key, bg, text } of semanticColumns) {
    const colIdx = colIndexByKey[key];
    if (!colIdx) continue;
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const cell = sheet.getCell(rowIdx, colIdx);
      if (cell.value === "—") continue; // keep muted style for empty values
      fillCell(cell, bg);
      cell.font = { color: { argb: text }, bold: key === "queens" };
    }
  }

  // ── Pass 4: Price Index — color-scaled against Target Index ──
  // Bands are derived from the SAME tolerance the helper uses to decide
  // KEEP vs PRICE_UP/PRICE_DOWN (PRICE_ANALYSIS_CONFIG.TOLERANCE_BAND_PERCENT),
  // so the cell color never disagrees with the Action pill next to it.
  const tolerance = Number(PRICE_ANALYSIS_CONFIG.TOLERANCE_BAND_PERCENT); // e.g. 5
  const nearEdgeBand = tolerance / 2; // e.g. 2.5 — "safe but watch it"

  const indexColIdx = colIndexByKey["index"];
  const targetColIdx = colIndexByKey["target"];
  if (indexColIdx) {
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const indexCell = sheet.getCell(rowIdx, indexColIdx);
      const targetVal =
        targetColIdx && sheet.getCell(rowIdx, targetColIdx).value !== "—"
          ? Number(sheet.getCell(rowIdx, targetColIdx).value)
          : null;
      const indexVal = indexCell.value !== "—" ? Number(indexCell.value) : null;

      let scale = INDEX_SCALE.neutral;
      if (indexVal !== null && targetVal !== null) {
        const diff = Math.abs(indexVal - targetVal);
        if (diff <= nearEdgeBand)
          scale = INDEX_SCALE.good; // safely inside tolerance
        else if (diff <= tolerance)
          scale = INDEX_SCALE.warn; // still KEEP, but near the edge
        else scale = INDEX_SCALE.bad; // outside tolerance — already actioned
      }
      fillCell(indexCell, scale.bg);
      indexCell.font = { color: { argb: scale.text }, bold: true };
    }
  }

  // ── Pass 5: Action column — solid "pill" fill per action type ──
  const actionColIdx = colIndexByKey["action"];
  if (actionColIdx) {
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const cell = sheet.getCell(rowIdx, actionColIdx);
      const scale = ACTION_SCALE[cell.value] || ACTION_SCALE.DEFAULT;
      fillCell(cell, scale.bg);
      cell.font = { color: { argb: scale.text }, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  }

  // Autofilter across the full header so users can sort/filter in Excel
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: totalCols },
  };

  // ────────────────────────────────────────────────────────────
  // Legend — placed a couple of columns to the right of the table
  // ────────────────────────────────────────────────────────────
  const legendCol = totalCols + 2;
  const legendLetter = sheet.getColumn(legendCol).letter;
  const swatchLetter = sheet.getColumn(legendCol + 1).letter;
  sheet.getColumn(legendCol).width = 16;
  sheet.getColumn(legendCol + 1).width = 14;

  const legendTitle = sheet.getCell(`${legendLetter}1`);
  sheet.mergeCells(`${legendLetter}1:${swatchLetter}1`);
  legendTitle.value = "Legend";
  legendTitle.font = { bold: true, size: 12, color: { argb: PALETTE.white } };
  legendTitle.alignment = { vertical: "middle", horizontal: "center" };
  fillCell(legendTitle, PALETTE.brandDark);
  sheet.getRow(1).height = 26;

  const legendEntries = [
    { section: "Action" },
    { label: "Keep", ...ACTION_SCALE.KEEP },
    { label: "Price Down", ...ACTION_SCALE.PRICE_DOWN },
    { label: "Price Up", ...ACTION_SCALE.PRICE_UP },
    { label: "Review", ...ACTION_SCALE.REVIEW },
    { spacer: true },
    { section: "Price Index vs Target" },
    { label: `On target (≤${nearEdgeBand} pts)`, ...INDEX_SCALE.good },
    { label: `Near edge (≤${tolerance} pts)`, ...INDEX_SCALE.warn },
    { label: `Outside tolerance (>${tolerance} pts)`, ...INDEX_SCALE.bad },
  ];

  let legendRowIdx = 2;
  for (const entry of legendEntries) {
    const labelCell = sheet.getCell(`${legendLetter}${legendRowIdx}`);
    const swatchCell = sheet.getCell(`${swatchLetter}${legendRowIdx}`);

    if (entry.spacer) {
      legendRowIdx += 1;
      continue;
    }

    if (entry.section) {
      sheet.mergeCells(
        `${legendLetter}${legendRowIdx}:${swatchLetter}${legendRowIdx}`,
      );
      labelCell.value = entry.section;
      labelCell.font = { bold: true, color: { argb: PALETTE.labelText } };
      fillCell(labelCell, PALETTE.brandTealLight);
      labelCell.alignment = { vertical: "middle", indent: 1 };
      labelCell.border = thinGrid;
      swatchCell.border = thinGrid;
    } else {
      labelCell.value = entry.label;
      labelCell.font = { color: { argb: PALETTE.labelText } };
      labelCell.alignment = { vertical: "middle", indent: 1 };
      labelCell.border = thinGrid;
      fillCell(swatchCell, entry.bg);
      swatchCell.font = { color: { argb: entry.text }, bold: true };
      swatchCell.alignment = { vertical: "middle", horizontal: "center" };
      swatchCell.border = thinGrid;
    }
    legendRowIdx += 1;
  }

  // 6. Serialize
  const buffer = await workbook.xlsx.writeBuffer();

  const periodSlug = surveyPeriod?.name
    ? surveyPeriod.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
    : "all-periods";

  const filename = `price-analysis-${periodSlug}-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return { buffer, filename };
};

export const priceAnalysisService = {
  calculateProductAnalysis,
  recalculateSurveyPeriodAnalysis,
  getPriceAnalysisById,
  getProductSurveyPeriodAnalysis,
  listPriceAnalyses,
  resolveBenchmarkForSurveyPeriod,
  generatePriceAnalysisExcel,
};
