import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  shouldCreateAlert,
  determineAlertSeverity,
  buildAlertMessage,
  formatAlertResponse,
} from "./alert.helper.js";

const ALERT_INCLUDE_RELATIONS = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
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
  resolvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
};

/**
 * Creates or updates an Alert directly derived from a PriceAnalysis record.
 * Idempotent: If an unresolved alert exists for the product and survey period, updates it.
 */
export const createAlertFromPriceAnalysis = async (priceAnalysisId) => {
  const analysis = await prisma.priceAnalysis.findUnique({
    where: { id: priceAnalysisId },
    include: {
      product: true,
      surveyPeriod: true,
    },
  });

  if (!analysis) {
    throw new ApiError(404, `Price Analysis [${priceAnalysisId}] not found`);
  }

  // 1. Check if condition qualifies for an alert
  if (!shouldCreateAlert(analysis)) {
    return null;
  }

  // 2. Derive analytical values
  const severity = determineAlertSeverity(analysis);
  const message = buildAlertMessage({
    priceAnalysis: analysis,
    product: analysis.product,
    surveyPeriod: analysis.surveyPeriod,
  });

  // Competitor price representation: prefers minimum competitor price if available, else average
  const competitorPrice =
    analysis.minimumCompetitorPrice !== null
      ? analysis.minimumCompetitorPrice
      : analysis.competitorAveragePrice;

  // 3. Check for existing active/unresolved alert for this product & survey period
  const existingActiveAlert = await prisma.alert.findFirst({
    where: {
      productId: analysis.productId,
      surveyPeriodId: analysis.surveyPeriodId,
      resolved: false,
    },
  });

  let alertRecord;

  if (existingActiveAlert) {
    // Update existing active alert with latest analysis snapshot
    alertRecord = await prisma.alert.update({
      where: { id: existingActiveAlert.id },
      data: {
        type: analysis.action,
        severity,
        message,
        queensPrice: analysis.queensPrice,
        competitorPrice,
        priceIndex: analysis.priceIndex,
      },
      include: ALERT_INCLUDE_RELATIONS,
    });
  } else {
    // Create new alert record
    alertRecord = await prisma.alert.create({
      data: {
        productId: analysis.productId,
        surveyPeriodId: analysis.surveyPeriodId,
        type: analysis.action,
        severity,
        message,
        queensPrice: analysis.queensPrice,
        competitorPrice,
        priceIndex: analysis.priceIndex,
        resolved: false,
      },
      include: ALERT_INCLUDE_RELATIONS,
    });
  }

  return formatAlertResponse(alertRecord);
};

/**
 * Batch generates alerts for all PriceAnalyses in a given survey period.
 */
export const generateAlertsForSurveyPeriod = async (surveyPeriodId) => {
  const surveyPeriod = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
  });

  if (!surveyPeriod) {
    throw new ApiError(404, `SurveyPeriod [${surveyPeriodId}] not found`);
  }

  const analyses = await prisma.priceAnalysis.findMany({
    where: { surveyPeriodId },
  });

  const alertsCreated = [];

  for (const analysis of analyses) {
    const alert = await createAlertFromPriceAnalysis(analysis.id);
    if (alert) {
      alertsCreated.push(alert);
    }
  }

  return {
    surveyPeriodId,
    totalAnalysesEvaluated: analyses.length,
    alertsGeneratedCount: alertsCreated.length,
    alerts: alertsCreated,
  };
};

/**
 * Resolves an active alert.
 * Records the resolving user and timestamp for auditability.
 */
export const resolveAlert = async ({ alertId, user, resolutionNote }) => {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
  });

  if (!alert) {
    throw new ApiError(404, `Alert [${alertId}] not found`);
  }

  if (alert.resolved) {
    throw new ApiError(409, `Alert [${alertId}] has already been resolved`);
  }

  const updatedAlert = await prisma.alert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedById: user.id,
      resolutionNote: resolutionNote?.trim() || null,
    },
    include: ALERT_INCLUDE_RELATIONS,
  });

  return formatAlertResponse(updatedAlert);
};

/**
 * Retrieves a single Alert by ID.
 */
export const getAlertById = async (alertId) => {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: ALERT_INCLUDE_RELATIONS,
  });

  if (!alert) {
    throw new ApiError(404, `Alert [${alertId}] not found`);
  }

  return formatAlertResponse(alert);
};

/**
 * Lists alerts with pagination, sorting, and filters.
 */
export const listAlerts = async (query = {}) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 20,
    productId,
    surveyPeriodId,
    type,
    severity,
    resolved,
    from,
    to,
  } = query;

  // Explicitly parse and sanitize pagination parameters to ensure integer types for Prisma
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));

  const where = {};

  if (productId) where.productId = productId;
  if (surveyPeriodId) where.surveyPeriodId = surveyPeriodId;
  if (type) where.type = type;
  if (severity) where.severity = severity;

  // Safely parse boolean whether passed as boolean or string ("true"/"false")
  if (resolved !== undefined && resolved !== null) {
    where.resolved = resolved === true || resolved === "true";
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      where.createdAt.lte = toDate;
    }
  }

  const skip = (page - 1) * limit;

  const [total, alerts] = await prisma.$transaction([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      skip,
      take: limit, // Explicit integer ensures valid Prisma execution
      orderBy: { createdAt: "desc" },
      include: ALERT_INCLUDE_RELATIONS,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: alerts.map(formatAlertResponse),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const alertService = {
  createAlertFromPriceAnalysis,
  generateAlertsForSurveyPeriod,
  resolveAlert,
  getAlertById,
  listAlerts,
};
