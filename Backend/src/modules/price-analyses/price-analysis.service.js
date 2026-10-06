import prisma from "../../config/db.js";
import pkg from "@prisma/client";
const { Prisma } = pkg;
import ApiError from "../../utils/api-error.js";
import {
  calculateCompetitorAggregates,
  calculatePriceIndex,
  getTargetIndex,
  determinePriceAction,
  formatPriceAnalysisResponse,
  PRICE_ANALYSIS_CONFIG,
  calculateRecommendedPrice,
} from "./price-analysis.helper.js";
import { queensPriceService } from "../queens-prices/queens-price.service.js";
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
 * Resolves the active Queens benchmark price for a given product and survey period.
 * Strictly prioritizes CURRENT active benchmarks (effectiveTo = null) for OPEN cycles.
 */
export const resolveBenchmarkForSurveyPeriod = async (productId, surveyPeriod) => {
  const now = new Date();

  // 1. For active/OPEN survey periods, strictly prioritize the CURRENT active benchmark
  if (!surveyPeriod || surveyPeriod.status === "OPEN") {
    const currentBenchmark = await prisma.queensPrice.findFirst({
      where: {
        productId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (currentBenchmark) return currentBenchmark;
  }

  const startDate = new Date(surveyPeriod.startDate);
  const endDate = new Date(surveyPeriod.endDate);

  // 2. Strict historical: benchmark effective at start of period
  let benchmark = await prisma.queensPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: startDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: startDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (benchmark) return benchmark;

  // 3. Fallback: most recent benchmark effective before the period ended
  benchmark = await prisma.queensPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: endDate },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (benchmark) return benchmark;

  // 4. Ultimate fallback: most recent benchmark record
  return prisma.queensPrice.findFirst({
    where: { productId },
    orderBy: { effectiveFrom: "desc" },
  });
};
/**
 * Retrieves calculation readiness metrics for a survey period:
 * Counts assigned products, approved observations, and items pending review.
 *
 * A product is considered "ready" for calculation when it has at least one
 * APPROVED observation. It is "pending review" when it has pending
 * observations but no approved ones. Everything else is "unobserved".
 *
 * Returns aggregate counts plus a per-stream (Fresh / FMCG) breakdown.
 */
export const getSurveyPeriodReadiness = async (surveyPeriodId) => {
  const surveyPeriod = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
    include: {
      assignments: {
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, category: true },
              },
            },
          },
        },
      },
    },
  });

  if (!surveyPeriod) {
    throw new ApiError(404, `SurveyPeriod [${surveyPeriodId}] not found`);
  }

  // 1. Collect all distinct assigned products
  const assignedProductsMap = new Map();
  for (const asn of surveyPeriod.assignments) {
    for (const it of asn.items) {
      if (!assignedProductsMap.has(it.productId)) {
        assignedProductsMap.set(it.productId, it.product);
      }
    }
  }

  const assignedProductIds = Array.from(assignedProductsMap.keys());
  const totalAssigned = assignedProductIds.length;

  if (totalAssigned === 0) {
    return {
      surveyPeriodId,
      totalAssigned: 0,
      approvedProductsCount: 0,
      pendingReviewProductsCount: 0,
      unobservedProductsCount: 0,
      readinessPercent: 0,
      freshStream: { total: 0, approved: 0, pending: 0, percent: 0 },
      fmcgStream: { total: 0, approved: 0, pending: 0, percent: 0 },
    };
  }

  // 2. Query observations for these products in this period
  const observations = await prisma.priceObservation.findMany({
    where: {
      productId: { in: assignedProductIds },
      audit: { surveyPeriodId },
      availability: "AVAILABLE",
      price: { not: null, gt: 0 },
    },
    select: {
      productId: true,
      reviewStatus: true,
    },
  });

  const approvedProductIds = new Set();
  const pendingProductIds = new Set();

  for (const obs of observations) {
    if (obs.reviewStatus === "APPROVED") {
      approvedProductIds.add(obs.productId);
    } else if (obs.reviewStatus === "PENDING") {
      pendingProductIds.add(obs.productId);
    }
  }

  // If a product has at least 1 approved observation, it is ready for calculation
  const readyProductIds = approvedProductIds;
  // A product is pending review if it has pending observations and NO approved ones yet
  const pendingOnlyProductIds = new Set(
    [...pendingProductIds].filter((id) => !readyProductIds.has(id)),
  );

  const freshCategories = PRICE_ANALYSIS_CONFIG.FRESH_CATEGORIES;

  let freshTotal = 0;
  let freshApproved = 0;
  let freshPending = 0;

  let fmcgTotal = 0;
  let fmcgApproved = 0;
  let fmcgPending = 0;

  for (const [prodId, prod] of assignedProductsMap) {
    const isFresh = freshCategories.includes(
      (prod.category || "").toLowerCase(),
    );
    const isApproved = readyProductIds.has(prodId);
    const isPending = pendingOnlyProductIds.has(prodId);

    if (isFresh) {
      freshTotal++;
      if (isApproved) freshApproved++;
      if (isPending) freshPending++;
    } else {
      fmcgTotal++;
      if (isApproved) fmcgApproved++;
      if (isPending) fmcgPending++;
    }
  }

  const unobserved = Math.max(
    0,
    totalAssigned - readyProductIds.size - pendingOnlyProductIds.size,
  );
  const readinessPercent =
    totalAssigned > 0
      ? Math.round((readyProductIds.size / totalAssigned) * 100)
      : 0;

  return {
    surveyPeriodId,
    totalAssigned,
    approvedProductsCount: readyProductIds.size,
    pendingReviewProductsCount: pendingOnlyProductIds.size,
    unobservedProductsCount: unobserved,
    readinessPercent,
    freshStream: {
      total: freshTotal,
      approved: freshApproved,
      pending: freshPending,
      percent:
        freshTotal > 0 ? Math.round((freshApproved / freshTotal) * 100) : 0,
    },
    fmcgStream: {
      total: fmcgTotal,
      approved: fmcgApproved,
      pending: fmcgPending,
      percent: fmcgTotal > 0 ? Math.round((fmcgApproved / fmcgTotal) * 100) : 0,
    },
  };
};

/**
 * Calculates price analysis for a product with support for historical asOfDate.
 *
 * - When `asOfDate` is provided, the benchmark and the observation window are
 *   both pinned to that date, enabling point-in-time / historical recalculation.
 * - When `asOfDate` is omitted, the current benchmark and all approved
 *   observations for the survey period are used.
 *
 * Idempotent via @@unique([productId, surveyPeriodId]).
 */
export const calculateProductAnalysis = async ({
  productId,
  surveyPeriodId,
  asOfDate = null,
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

  // 3. Resolve target date — asOfDate pins the calculation to end-of-day UTC
  const targetDate = asOfDate
    ? new Date(`${asOfDate}T23:59:59.999Z`)
    : new Date();

  // 4. Resolve benchmark
  //    - When asOfDate is given, ask the Queens price service for the price
  //      active at that exact date (true historical lookup).
  //    - Otherwise fall back to the survey-period resolver.
  let benchmark = asOfDate
    ? await queensPriceService.getQueensPriceAtDate(productId, targetDate)
    : null;

  if (!benchmark) {
    benchmark = await resolveBenchmarkForSurveyPeriod(productId, surveyPeriod);
  }

  if (!benchmark) {
    throw new ApiError(
      422,
      `No Queens benchmark price found for product "${product.name}" (${productId}) on ${targetDate
        .toISOString()
        .slice(0, 10)}.`,
    );
  }

  // 5. Filter observations by date window if asOfDate is specified
  const dateFilter = asOfDate
    ? {
      capturedAt: {
        gte: new Date(`${asOfDate}T00:00:00.000Z`),
        lte: new Date(`${asOfDate}T23:59:59.999Z`),
      },
    }
    : {};

  const observations = await prisma.priceObservation.findMany({
    where: {
      productId,
      audit: { surveyPeriodId },
      availability: "AVAILABLE",
      price: { not: null, gt: 0 },
      // Analytical data integrity: only APPROVED observations are included in pricing calculations
      reviewStatus: "APPROVED",
      ...dateFilter,
    },
    select: {
      price: true,
    },
  });

  const observedPrices = observations.map((o) => o.price);

  // 6. Aggregate competitor prices
  const { minimumCompetitorPrice, competitorAveragePrice, count } =
    calculateCompetitorAggregates(observedPrices);

  // 7. Compute Price Index
  const priceIndex = competitorAveragePrice
    ? calculatePriceIndex(benchmark.price, competitorAveragePrice)
    : null;

  // 8. Resolve Target Index
  const targetIndex = getTargetIndex(product);

  // 9. Determine Action
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

  // 10. Atomic Upsert via unique composite key
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
      calculatedAt: targetDate,
      notes: analysisNotes,
    },
    update: {
      queensPrice: benchmark.price,
      minimumCompetitorPrice,
      competitorAveragePrice,
      priceIndex,
      targetIndex,
      action,
      calculatedAt: targetDate,
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
 * Recalculates analysis with stream filtering ('ALL' | 'FRESH' | 'FMCG') and asOfDate.
 *
 * Accepts either a bare surveyPeriodId string (legacy) or a full options object.
 */
export const recalculateSurveyPeriodAnalysis = async (input) => {
  const payload = typeof input === "string" ? { surveyPeriodId: input } : input;
  const {
    surveyPeriodId,
    categoryStream = "ALL",
    asOfDate = null,
  } = payload;

  const surveyPeriod = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
    include: {
      assignments: {
        include: {
          items: {
            include: {
              product: { select: { id: true, category: true } },
            },
          },
        },
      },
    },
  });

  if (!surveyPeriod) {
    throw new ApiError(404, `SurveyPeriod [${surveyPeriodId}] not found`);
  }

  const freshCategories = PRICE_ANALYSIS_CONFIG.FRESH_CATEGORIES;
  const productIds = new Set();

  for (const assignment of surveyPeriod.assignments) {
    for (const item of assignment.items) {
      const category = (item.product?.category || "").trim().toLowerCase();
      const isFresh = freshCategories.includes(category);

      if (categoryStream === "ALL") {
        productIds.add(item.productId);
      } else if (categoryStream === "FRESH" && isFresh) {
        productIds.add(item.productId);
      } else if (categoryStream === "FMCG" && !isFresh) {
        productIds.add(item.productId);
      }
    }
  }

  if (productIds.size === 0) {
    return {
      surveyPeriodId,
      categoryStream,
      totalAssignedProducts: 0,
      processedCount: 0,
      failedCount: 0,
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
        asOfDate,
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
    categoryStream,
    totalAssignedProducts: productIds.size,
    processedCount: results.length,
    failedCount: errors.length,
    analyses: results,
    errors,
  };
};

/**
 * 1-Click apply recommended price to Queens benchmark.
 * Closes previous open-ended price and creates new QueensPrice effective immediately.
 */
export const applyRecommendedPrice = async (analysisId, currentUser) => {
  const analysis = await prisma.priceAnalysis.findUnique({
    where: { id: analysisId },
    include: { product: true },
  });

  if (!analysis) throw new ApiError(404, "Price analysis record not found");
  if (!analysis.competitorAveragePrice) {
    throw new ApiError(
      400,
      "Cannot calculate recommended price without competitor observations.",
    );
  }

  const newPriceDecimal = calculateRecommendedPrice(
    analysis.competitorAveragePrice,
    analysis.targetIndex,
  );
  if (!newPriceDecimal) {
    throw new ApiError(400, "Unable to compute recommended price.");
  }

  const newPrice = newPriceDecimal.toNumber();
  const now = new Date();

  // Create new benchmark price (auto-closes prior open-ended record)
  const benchmark = await queensPriceService.createQueensPrice({
    productId: analysis.productId,
    price: newPrice,
    effectiveFrom: now,
    source: `Price Analysis Automation (${currentUser?.name || "Manager"})`,
    notes: `1-Click adjustment to match target index ${analysis.targetIndex}% from competitor avg ${analysis.competitorAveragePrice} ETB`,
  });

  // Recalculate analysis immediately
  const updatedAnalysis = await calculateProductAnalysis({
    productId: analysis.productId,
    surveyPeriodId: analysis.surveyPeriodId,
  });

  return {
    success: true,
    newPrice,
    benchmark,
    analysis: updatedAnalysis,
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
 * List Price Analyses with filtering, pagination, and active CURRENT benchmark resolution.
 */
export const listPriceAnalyses = async (query = {}) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 20,
    surveyPeriodId,
    productId,
    action,
    category,
    asOfDate,
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

  if (asOfDate) {
    where.calculatedAt = {
      gte: new Date(`${asOfDate}T00:00:00.000Z`),
      lte: new Date(`${asOfDate}T23:59:59.999Z`),
    };
  } else if (from || to) {
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

  // Fetch approved competitor prices for all analyses on this page
  const competitorMap = await fetchApprovedCompetitorPrices(records);

  // Strictly resolve CURRENT active benchmarks (effectiveTo = null / Present)
  const now = new Date();
  const activeBenchmarks = await prisma.queensPrice.findMany({
    where: {
      productId: { in: records.map((r) => r.productId) },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const activeBenchmarkMap = new Map();
  for (const b of activeBenchmarks) {
    if (!activeBenchmarkMap.has(b.productId)) {
      activeBenchmarkMap.set(b.productId, b);
    }
  }

  const enrichedRecords = records.map((r) => {
    // Priority: Active CURRENT benchmark (effectiveTo = null) > snapshot
    const activeBenchmark = activeBenchmarkMap.get(r.productId);
    const activePrice = activeBenchmark
      ? Number(activeBenchmark.price)
      : Number(r.queensPrice);

    const avg =
      r.competitorAveragePrice !== null
        ? Number(r.competitorAveragePrice)
        : null;

    // Dynamically recalculate priceIndex & action if benchmark price was updated
    const liveIndexDecimal = avg ? calculatePriceIndex(activePrice, avg) : null;
    const liveIndex =
      liveIndexDecimal !== null
        ? Number(liveIndexDecimal)
        : r.priceIndex !== null
          ? Number(r.priceIndex)
          : null;

    const liveAction = determinePriceAction({
      priceIndex: liveIndex !== null ? new Prisma.Decimal(liveIndex) : null,
      targetIndex:
        r.targetIndex !== null ? new Prisma.Decimal(r.targetIndex) : null,
      observationCount: (competitorMap.get(r.productId) || []).length,
    });

    const rec = calculateRecommendedPrice(avg, r.targetIndex);

    const base = formatPriceAnalysisResponse({
      ...r,
      queensPrice: activePrice,
      priceIndex: liveIndex,
      action: liveAction,
      recommendedPrice: rec !== null ? Number(rec) : null,
    });

    return {
      ...base,
      competitorPrices: competitorMap.get(r.productId) || [],
    };
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: enrichedRecords,
    meta: { page, limit, total, totalPages },
  };
};

/**
 * Normalizes category string to determine if it is Ultra-Sensitive FMCG.
 */
const isUltraSensitiveCategory = (category) => {
  const norm = String(category || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return norm === "ultrasensitive";
};

/**
 * Resolves a normalized competitor key and clean column label.
 */
const resolveCompetitorMeta = (competitorName, storeName) => {
  const norm = String(competitorName || storeName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (norm.includes("garment")) return { key: "comp_garment", label: "Garment" };
  if (norm.includes("freshcorner")) return { key: "comp_fresh_corner", label: "Fresh Corner" };
  if (norm.includes("straight")) return { key: "comp_straight", label: "Straight Market" };
  if (norm.includes("shoa")) return { key: "comp_shoa", label: "Shoa" };
  if (norm.includes("abadir")) return { key: "comp_abadir", label: "Abadir" };
  if (norm.includes("allmart")) return { key: "comp_allmart", label: "Allmart" };
  if (norm.includes("bambi")) return { key: "comp_bambis", label: "Bambis" };

  const cleanLabel = (competitorName || storeName || "Competitor")
    .replace(/\s*[-–(].*$/, "")
    .trim();
  return { key: `comp_${norm}`, label: cleanLabel };
};

/**
 * Standard canonical competitor columns per commercial stream.
 */
const CANONICAL_COMPETITORS = {
  FRESH_CORNER: [
    { key: "comp_garment", label: "Garment" },
    { key: "comp_fresh_corner", label: "Fresh Corner" },
    { key: "comp_straight", label: "Straight Market" },
  ],
  ULTRA_SENSITIVE: [
    { key: "comp_shoa", label: "Shoa" },
    { key: "comp_abadir", label: "Abadir" },
    { key: "comp_allmart", label: "Allmart" },
    { key: "comp_bambis", label: "Bambis" },
  ],
};

/**
 * Builds an analysis table worksheet for a specific stream (Fresh Corner or Ultra-Sensitive).
 */
const buildStreamAnalysisSheet = (
  workbook,
  {
    streamType, // "FRESH_CORNER" | "ULTRA_SENSITIVE" | "ALL"
    sheetName,
    tabColor,
    analyses,
    competitorMap,
    PALETTE,
    INDEX_SCALE,
    ACTION_SCALE,
    thinGrid,
    fillCell,
  },
) => {
  // 1. Establish canonical competitor columns for this stream
  const baseColumns = CANONICAL_COMPETITORS[streamType] || [];
  const compColumnsMap = new Map(baseColumns.map((c) => [c.key, c]));

  // Discover if any additional competitors were observed for items in this stream
  for (const a of analyses) {
    const cpList = competitorMap.get(a.productId) || [];
    for (const cp of cpList) {
      const meta = resolveCompetitorMeta(cp.competitorName, cp.storeName);
      if (!compColumnsMap.has(meta.key)) {
        compColumnsMap.set(meta.key, meta);
      }
    }
  }

  const competitorColumns = [...compColumnsMap.values()];

  // 2. Create worksheet
  const sheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: tabColor } },
  });

  sheet.columns = [
    { header: "Product", key: "product", width: 32 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Category", key: "category", width: 18 },
    { header: "Queens Price (ETB)", key: "queens", width: 18 },
    ...competitorColumns.map((c) => ({
      header: c.label,
      key: c.key,
      width: 18,
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

  // 3. Header styling
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

  // Freeze header and identification columns (Product, SKU, Category)
  sheet.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];

  // 4. Populate rows
  for (const a of analyses) {
    const cpList = competitorMap.get(a.productId) || [];

    // Map prices by competitor column key (resolving peer stores of the same competitor)
    const priceByCompetitor = new Map();
    for (const cp of cpList) {
      const meta = resolveCompetitorMeta(cp.competitorName, cp.storeName);
      if (!priceByCompetitor.has(meta.key) || cp.price < priceByCompetitor.get(meta.key)) {
        priceByCompetitor.set(meta.key, cp.price);
      }
    }

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

    for (const c of competitorColumns) {
      const v = priceByCompetitor.get(c.key);
      row[c.key] = v !== undefined && v !== null ? Number(v) : null;
    }

    sheet.addRow(row);
  }

  const numericKeys = [
    "queens",
    "min",
    "avg",
    "index",
    "target",
    ...competitorColumns.map((c) => c.key),
  ];

  // Pass 1: Zebra striping & gridlines
  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const bandArgb = rowIdx % 2 === 0 ? PALETTE.bandOdd : PALETTE.bandEven;
    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(rowIdx, c);
      fillCell(cell, bandArgb);
      cell.border = thinGrid;
      cell.font = { color: { argb: PALETTE.labelText } };
    }
  }

  // Pass 2: Numeric currency formatting
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

  // Pass 3: Semantic highlight fills
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
      if (cell.value === "—") continue;
      fillCell(cell, bg);
      cell.font = { color: { argb: text }, bold: key === "queens" };
    }
  }

  // Pass 4: Price Index color scaling
  const tolerance = Number(PRICE_ANALYSIS_CONFIG.TOLERANCE_BAND_PERCENT);
  const nearEdgeBand = tolerance / 2;

  const indexColIdx = colIndexByKey["index"];
  const targetColIdx = colIndexByKey["target"];
  if (indexColIdx) {
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const indexCell = sheet.getCell(rowIdx, indexColIdx);
      const targetVal =
        targetColIdx && sheet.getCell(rowIdx, targetColIdx).value !== "—"
          ? Number(sheet.getCell(rowIdx, targetColIdx).value)
          : null;
      const indexVal =
        indexCell.value !== "—" ? Number(indexCell.value) : null;

      let scale = INDEX_SCALE.neutral;
      if (indexVal !== null && targetVal !== null) {
        const diff = Math.abs(indexVal - targetVal);
        if (diff <= nearEdgeBand) scale = INDEX_SCALE.good;
        else if (diff <= tolerance) scale = INDEX_SCALE.warn;
        else scale = INDEX_SCALE.bad;
      }
      fillCell(indexCell, scale.bg);
      indexCell.font = { color: { argb: scale.text }, bold: true };
    }
  }

  // Pass 5: Action column pills
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

  // Autofilter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: totalCols },
  };

  // 5. Legend on the right
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
};
export const generatePriceAnalysisExcel = async ({ surveyPeriodId } = {}) => {
  // 1. Load survey period
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

  // 2. Load all analyses
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

  // 3. Fetch approved competitor prices
  const competitorMap = await fetchApprovedCompetitorPrices(analyses);

  // 4. Partition analyses into Fresh Corner vs. Ultra-Sensitive
  const freshAnalyses = analyses.filter(
    (a) => !isUltraSensitiveCategory(a.product?.category),
  );
  const ultraAnalyses = analyses.filter((a) =>
    isUltraSensitiveCategory(a.product?.category),
  );

  // 5. Build workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Aires Communication PLC";
  workbook.created = new Date();

  // Color system
  const PALETTE = {
    brandDark: "FF063970",
    brandTeal: "FFD9A441",
    brandTealLight: "FFDCEAF7",
    headerBg: "FF063970",
    headerBorder: "FFD9A441",
    white: "FFFFFFFF",
    bandEven: "FFFFFFFF",
    bandOdd: "FFF8FAFC",
    gridLine: "FFE2E8F0",
    labelText: "FF334155",
    mutedText: "FF94A3B8",
    queensFill: "FFFEF3C7",
    queensText: "FF92400E",
    minFill: "FFECFDF5",
    minText: "FF047857",
    avgFill: "FFEFF6FF",
    avgText: "FF1D4ED8",
    targetFill: "FFF1F5F9",
    targetText: "FF475569",
    freshTab: "FF017C4D",
    ultraTab: "FFA41821",
  };

  const INDEX_SCALE = {
    good: { bg: "FFD1FAE5", text: "FF065F46" },
    warn: { bg: "FFFEF3C7", text: "FF92400E" },
    bad: { bg: "FFFEE2E2", text: "FF991B1B" },
    neutral: { bg: "FFF1F5F9", text: "FF64748B" },
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
  // Sheet 1: Report Info
  // ────────────────────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet("Report Info", {
    properties: { tabColor: { argb: PALETTE.brandTeal } },
  });
  infoSheet.columns = [
    { key: "field", width: 26 },
    { key: "value", width: 50 },
  ];

  infoSheet.mergeCells("A1:B1");
  const titleCell = infoSheet.getCell("A1");
  titleCell.value = "Price Analysis Report";
  titleCell.font = { bold: true, size: 16, color: { argb: PALETTE.white } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  fillCell(titleCell, PALETTE.brandDark);
  infoSheet.getRow(1).height = 32;

  infoSheet.addRow(["", ""]);

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
    ["Prepared By", "Aires Communication PLC"],
    ["Total Products Analyzed", analyses.length],
    ["Fresh Corner Items", freshAnalyses.length],
    ["Ultra-Sensitive FMCG Items", ultraAnalyses.length],
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
  // Sheet 2: Fresh Corner Tab
  if (freshAnalyses.length > 0) {
    buildStreamAnalysisSheet(workbook, {
      streamType: "FRESH_CORNER",
      sheetName: "Fresh Corner",
      tabColor: PALETTE.freshTab,
      analyses: freshAnalyses,
      competitorMap,
      PALETTE,
      INDEX_SCALE,
      ACTION_SCALE,
      thinGrid,
      fillCell,
    });
  }

  // Sheet 3: Ultra-Sensitive Tab
  if (ultraAnalyses.length > 0) {
    buildStreamAnalysisSheet(workbook, {
      streamType: "ULTRA_SENSITIVE",
      sheetName: "Ultra-Sensitive",
      tabColor: PALETTE.ultraTab,
      analyses: ultraAnalyses,
      competitorMap,
      PALETTE,
      INDEX_SCALE,
      ACTION_SCALE,
      thinGrid,
      fillCell,
    });
  }

  // Fallback: If for any reason neither was categorized, render full set
  if (freshAnalyses.length === 0 && ultraAnalyses.length === 0) {
    buildStreamAnalysisSheet(workbook, {
      sheetName: "Price Analysis",
      tabColor: PALETTE.brandDark,
      analyses,
      competitorMap,
      PALETTE,
      INDEX_SCALE,
      ACTION_SCALE,
      thinGrid,
      fillCell,
    });
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
  applyRecommendedPrice,
  getPriceAnalysisById,
  getProductSurveyPeriodAnalysis,
  listPriceAnalyses,
  resolveBenchmarkForSurveyPeriod,
  generatePriceAnalysisExcel,
  getSurveyPeriodReadiness,
};