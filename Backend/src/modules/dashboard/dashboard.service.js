import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  calculateCompletionRate,
  mapGroupByCounts,
  formatRecentAlertItem,
} from "./dashboard.helper.js";

/**
 * Resolves the active survey period context:
 * 1. Explicitly requested `surveyPeriodId` if provided.
 * 2. Currently `OPEN` survey period if exists.
 * 3. Most recently started survey period as fallback.
 */
export const resolveSurveyPeriodScope = async (surveyPeriodId) => {
  if (surveyPeriodId) {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id: surveyPeriodId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    if (!period) {
      throw new ApiError(404, `Survey period [${surveyPeriodId}] not found`);
    }

    return period;
  }

  // Find currently OPEN period
  const openPeriod = await prisma.surveyPeriod.findFirst({
    where: { status: "OPEN" },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  if (openPeriod) {
    return openPeriod;
  }

  // Fallback to most recent period
  const latestPeriod = await prisma.surveyPeriod.findFirst({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  return latestPeriod || null;
};

/**
 * Retrieves full analytical and operational dashboard metrics.
 */
export const getDashboardData = async ({ user, query }) => {
  const { surveyPeriodId: requestedPeriodId, productId } = query;

  // 1. Resolve Target Survey Period
  const surveyPeriod = await resolveSurveyPeriodScope(requestedPeriodId);
  const periodId = surveyPeriod?.id || null;

  // 2. Base Filters
  const assignmentWhere = {};
  const auditWhere = {};
  const observationWhere = {};
  const analysisWhere = {};
  const alertWhere = {};

  if (periodId) {
    assignmentWhere.surveyPeriodId = periodId;
    auditWhere.surveyPeriodId = periodId;
    observationWhere.audit = { surveyPeriodId: periodId };
    analysisWhere.surveyPeriodId = periodId;
    alertWhere.surveyPeriodId = periodId;
  }

  // Role scoping: Field Auditors only see their own operational tasks
  if (user.role === "FIELD_AUDITOR") {
    assignmentWhere.auditorId = user.id;
    auditWhere.auditorId = user.id;
    observationWhere.auditorId = user.id;
  }

  if (productId) {
    observationWhere.productId = productId;
    analysisWhere.productId = productId;
    alertWhere.productId = productId;
  }

  // 3. Parallel Database Aggregations
  const [
    // Summary Master Data Counts
    totalProducts,
    activeProducts,
    totalCompetitors,
    totalStores,
    totalAuditors,

    // Survey Assignment Status GroupBy
    assignmentGroups,
    totalAssignments,

    // Audit Status GroupBy
    auditGroups,
    totalAudits,

    // Observation Availability & Review GroupBy
    observationAvailabilityGroups,
    observationReviewGroups,
    totalObservations,

    // Price Analysis Action GroupBy & Index Stats
    analysisActionGroups,
    analysisIndexAggregate,
    totalAnalyses,

    // Alert Severity & Resolution Counts
    alertSeverityGroups,
    totalAlerts,
    activeAlerts,
    resolvedAlerts,

    // Recent Active Alerts
    recentAlerts,

    // Trend: Historical Average Price Index by Survey Period
    historicalTrendAnalyses,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.competitor.count({ where: { active: true } }),
    prisma.store.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "FIELD_AUDITOR", active: true } }),

    // Assignments
    prisma.surveyAssignment.groupBy({
      by: ["status"],
      where: assignmentWhere,
      _count: { _all: true },
    }),
    prisma.surveyAssignment.count({ where: assignmentWhere }),

    // Audits
    prisma.audit.groupBy({
      by: ["status"],
      where: auditWhere,
      _count: { _all: true },
    }),
    prisma.audit.count({ where: auditWhere }),

    // Observations
    prisma.priceObservation.groupBy({
      by: ["availability"],
      where: observationWhere,
      _count: { _all: true },
    }),
    prisma.priceObservation.groupBy({
      by: ["reviewStatus"],
      where: observationWhere,
      _count: { _all: true },
    }),
    prisma.priceObservation.count({ where: observationWhere }),

    // Price Analyses
    prisma.priceAnalysis.groupBy({
      by: ["action"],
      where: analysisWhere,
      _count: { _all: true },
    }),
    prisma.priceAnalysis.aggregate({
      where: {
        ...analysisWhere,
        priceIndex: { not: null },
      },
      _avg: { priceIndex: true },
      _min: { priceIndex: true },
      _max: { priceIndex: true },
    }),
    prisma.priceAnalysis.count({ where: analysisWhere }),

    // Alerts
    prisma.alert.groupBy({
      by: ["severity"],
      where: alertWhere,
      _count: { _all: true },
    }),
    prisma.alert.count({ where: alertWhere }),
    prisma.alert.count({ where: { ...alertWhere, resolved: false } }),
    prisma.alert.count({ where: { ...alertWhere, resolved: true } }),

    // Recent 5 unresolved alerts with Product relation
    prisma.alert.findMany({
      where: { ...alertWhere, resolved: false },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: true },
        },
      },
    }),

    // Trend: Historical average price index grouped across survey periods
    prisma.priceAnalysis.groupBy({
      by: ["surveyPeriodId"],
      where: {
        priceIndex: { not: null },
        ...(productId ? { productId } : {}),
      },
      _avg: { priceIndex: true },
      _count: { _all: true },
    }),
  ]);

  // 4. Map GroupBy Results to Normalized Metrics
  const assignmentsByStatus = mapGroupByCounts(assignmentGroups, "status", [
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]);

  const auditsByStatus = mapGroupByCounts(auditGroups, "status", [
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NEEDS_REVIEW",
  ]);

  const observationsByAvailability = mapGroupByCounts(
    observationAvailabilityGroups,
    "availability",
    ["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"],
  );

  const observationsByReview = mapGroupByCounts(
    observationReviewGroups,
    "reviewStatus",
    ["PENDING", "APPROVED", "REJECTED", "NEEDS_REVIEW"],
  );

  const analysesByAction = mapGroupByCounts(analysisActionGroups, "action", [
    "PRICE_DOWN",
    "PRICE_UP",
    "KEEP",
    "REVIEW",
  ]);

  const alertsBySeverity = mapGroupByCounts(alertSeverityGroups, "severity", [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ]);

  // 5. Construct Historical Period Trend Details
  const periodIdsInTrend = historicalTrendAnalyses.map((t) => t.surveyPeriodId);
  const trendPeriods = await prisma.surveyPeriod.findMany({
    where: { id: { in: periodIdsInTrend } },
    select: { id: true, name: true, startDate: true },
    orderBy: { startDate: "asc" },
  });

  const periodNameMap = new Map(trendPeriods.map((p) => [p.id, p]));
  const priceTrend = historicalTrendAnalyses
    .map((item) => {
      const period = periodNameMap.get(item.surveyPeriodId);
      return {
        surveyPeriodId: item.surveyPeriodId,
        surveyPeriodName: period?.name || item.surveyPeriodId,
        startDate: period?.startDate || null,
        averagePriceIndex:
          item._avg.priceIndex !== null
            ? Number(Number(item._avg.priceIndex).toFixed(2))
            : null,
        analysesCount: item._count._all,
      };
    })
    .sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  // 6. Return Structured Unified Dashboard Payload
  return {
    scope: {
      surveyPeriod: surveyPeriod
        ? {
            id: surveyPeriod.id,
            name: surveyPeriod.name,
            startDate: surveyPeriod.startDate,
            endDate: surveyPeriod.endDate,
            status: surveyPeriod.status,
          }
        : null,
      productId: productId || null,
      roleScope: user.role,
    },
    summary: {
      totalProducts,
      activeProducts,
      totalCompetitors,
      totalStores,
      totalAuditors,
      totalAssignments,
      totalAudits,
      totalObservations,
      totalAnalyses,
      activeAlerts,
    },
    assignments: {
      total: totalAssignments,
      completionRate: calculateCompletionRate(
        assignmentsByStatus.COMPLETED,
        totalAssignments,
        assignmentsByStatus.CANCELLED,
      ),
      byStatus: assignmentsByStatus,
    },
    audits: {
      total: totalAudits,
      completionRate: calculateCompletionRate(
        auditsByStatus.COMPLETED,
        totalAudits,
        auditsByStatus.CANCELLED,
      ),
      byStatus: auditsByStatus,
    },
    observations: {
      total: totalObservations,
      byAvailability: observationsByAvailability,
      byReviewStatus: observationsByReview,
    },
    analysis: {
      total: totalAnalyses,
      byAction: analysesByAction,
      indexStats: {
        average:
          analysisIndexAggregate._avg.priceIndex !== null
            ? Number(Number(analysisIndexAggregate._avg.priceIndex).toFixed(2))
            : null,
        min:
          analysisIndexAggregate._min.priceIndex !== null
            ? Number(analysisIndexAggregate._min.priceIndex)
            : null,
        max:
          analysisIndexAggregate._max.priceIndex !== null
            ? Number(analysisIndexAggregate._max.priceIndex)
            : null,
      },
    },
    alerts: {
      total: totalAlerts,
      active: activeAlerts,
      resolved: resolvedAlerts,
      bySeverity: alertsBySeverity,
    },
    recentAlerts: recentAlerts.map(formatRecentAlertItem),
    priceTrend,
  };
};

export const dashboardService = {
  getDashboardData,
  resolveSurveyPeriodScope,
};
