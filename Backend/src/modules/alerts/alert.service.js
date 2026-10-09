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
 * Attaches the linked PriceAnalysis (if any) to an alert so the
 * frontend can open the Rapid Adjust drawer with a valid analysis
 * payload (recommendedPrice, targetIndex, competitorAveragePrice, etc.).
 */
const withLinkedAnalysis = async (alerts) => {
  if (!Array.isArray(alerts) || alerts.length === 0) return alerts;

  const pairs = alerts.map((a) => ({
    productId: a.productId,
    surveyPeriodId: a.surveyPeriodId,
  }));

  const analyses = await prisma.priceAnalysis.findMany({
    where: {
      OR: pairs.map((p) => ({
        productId: p.productId,
        surveyPeriodId: p.surveyPeriodId,
      })),
    },
    select: {
      id: true,
      productId: true,
      surveyPeriodId: true,
      queensPrice: true,
      minimumCompetitorPrice: true,
      competitorAveragePrice: true,
      priceIndex: true,
      targetIndex: true,
      action: true,
      notes: true,
      calculatedAt: true,
    },
  });

  const map = new Map();
  for (const a of analyses) {
    map.set(`${a.productId}|${a.surveyPeriodId}`, a);
  }

  return alerts.map((alert) => {
    const analysis = map.get(`${alert.productId}|${alert.surveyPeriodId}`);
    const base = formatAlertResponse(alert);
    if (!analysis) {
      return {
        ...base,
        analysisId: null,
        recommendedPrice: null,
        targetIndex: null,
        competitorAveragePrice: null,
        minimumCompetitorPrice: null,
        analysisAction: null,
        analysisNotes: null,
      };
    }
    return {
      ...base,
      analysisId: analysis.id,
      recommendedPrice:
        analysis.competitorAveragePrice !== null
          ? computeRecommendedPriceValue(
            analysis.competitorAveragePrice,
            analysis.targetIndex,
          )
          : null,
      targetIndex:
        analysis.targetIndex !== null ? Number(analysis.targetIndex) : null,
      competitorAveragePrice:
        analysis.competitorAveragePrice !== null
          ? Number(analysis.competitorAveragePrice)
          : null,
      minimumCompetitorPrice:
        analysis.minimumCompetitorPrice !== null
          ? Number(analysis.minimumCompetitorPrice)
          : null,
      analysisAction: analysis.action ?? null,
      analysisNotes: analysis.notes ?? null,
    };
  });
};

/**
 * Local mirror of the recommended-price formula used by the price-analysis
 * service (avg * targetIndex / 100). Kept here to avoid a circular import.
 */
const computeRecommendedPriceValue = (competitorAvg, targetIndex) => {
  if (competitorAvg === null || competitorAvg === undefined) return null;
  const avg = Number(competitorAvg);
  const target = targetIndex ? Number(targetIndex) : 100;
  if (!Number.isFinite(avg) || avg <= 0) return null;
  if (!Number.isFinite(target) || target <= 0) return null;
  return Math.round((avg * (target / 100)) * 100) / 100;
};

/**
 * Creates or updates an Alert derived from a PriceAnalysis record.
 * Idempotent when an unresolved alert already exists.
 *
 * ALSO: when the underlying condition no longer applies
 * (shouldCreateAlert === false), any existing OPEN alert for the same
 * product + survey period is AUTO-RESOLVED. This is what enables the
 * "silent resolution" flow when a manager fixes the price.
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

  // ─────────────────────────────────────────────────────────────
  // Case A: condition no longer applies → auto-resolve any open alert
  // ─────────────────────────────────────────────────────────────
  if (!shouldCreateAlert(analysis)) {
    const openAlert = await prisma.alert.findFirst({
      where: {
        productId: analysis.productId,
        surveyPeriodId: analysis.surveyPeriodId,
        resolved: false,
      },
    });

    if (openAlert) {
      await prisma.alert.update({
        where: { id: openAlert.id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolutionNote:
            "Auto-resolved: pricing condition closed after benchmark update.",
        },
      });
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // Case B: condition applies → create or update the alert
  // ─────────────────────────────────────────────────────────────
  const severity = determineAlertSeverity(analysis);
  const message = buildAlertMessage({
    priceAnalysis: analysis,
    product: analysis.product,
    surveyPeriod: analysis.surveyPeriod,
  });

  const competitorPrice =
    analysis.minimumCompetitorPrice !== null
      ? analysis.minimumCompetitorPrice
      : analysis.competitorAveragePrice;

  const existingActiveAlert = await prisma.alert.findFirst({
    where: {
      productId: analysis.productId,
      surveyPeriodId: analysis.surveyPeriodId,
      resolved: false,
    },
  });

  let alertRecord;

  if (existingActiveAlert) {
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

  const [enriched] = await withLinkedAnalysis([updatedAlert]);
  return enriched;
};

/**
 * Retrieves a single Alert by ID (with linked analysis metadata).
 */
export const getAlertById = async (alertId) => {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: ALERT_INCLUDE_RELATIONS,
  });

  if (!alert) {
    throw new ApiError(404, `Alert [${alertId}] not found`);
  }

  const [enriched] = await withLinkedAnalysis([alert]);
  return enriched;
};

/**
 * Lists alerts with pagination, sorting, filters, and linked-analysis metadata.
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

  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));

  const where = {};
  if (productId) where.productId = productId;
  if (surveyPeriodId) where.surveyPeriodId = surveyPeriodId;
  if (type) where.type = type;
  if (severity) where.severity = severity;

  if (resolved !== undefined && resolved !== null) {
    where.resolved = resolved === true || resolved === "true";
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
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
      take: limit,
      orderBy: { createdAt: "desc" },
      include: ALERT_INCLUDE_RELATIONS,
    }),
  ]);

  const enriched = await withLinkedAnalysis(alerts);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: enriched,
    meta: { page, limit, total, totalPages },
  };
};

export const alertService = {
  createAlertFromPriceAnalysis,
  generateAlertsForSurveyPeriod,
  resolveAlert,
  getAlertById,
  listAlerts,
};