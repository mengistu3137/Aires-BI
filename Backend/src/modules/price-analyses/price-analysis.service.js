import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  calculateCompetitorAggregates,
  calculatePriceIndex,
  getTargetIndex,
  determinePriceAction,
  formatPriceAnalysisResponse,
} from "./price-analysis.helper.js";
import { alertService } from "../alerts/alert.service.js";

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

  return formatPriceAnalysisResponse(analysis);
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
      productId_surveyPeriodId: {
        productId,
        surveyPeriodId,
      },
    },
    include: ANALYSIS_INCLUDE_RELATIONS,
  });

  if (!analysis) {
    throw new ApiError(
      404,
      `No Price Analysis found for product [${productId}] in survey period [${surveyPeriodId}]`,
    );
  }

  return formatPriceAnalysisResponse(analysis);
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

  // Merge product-level filters instead of overwriting
  if (category) {
    where.product = { ...(where.product || {}), category };
  }

  if (from || to) {
    where.calculatedAt = {};
    if (from) {
      where.calculatedAt.gte = new Date(from);
    }
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

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: records.map(formatPriceAnalysisResponse),
    meta: { page, limit, total, totalPages },
  };
};

export const priceAnalysisService = {
  calculateProductAnalysis,
  recalculateSurveyPeriodAnalysis,
  getPriceAnalysisById,
  getProductSurveyPeriodAnalysis,
  listPriceAnalyses,
  resolveBenchmarkForSurveyPeriod,
};
