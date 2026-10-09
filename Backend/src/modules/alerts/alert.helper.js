import pkg from "@prisma/client";
const { Prisma } = pkg;

const Decimal = Prisma.Decimal;

export const ALERT_CONFIG = {
  // Divergence percentages from target parity (100.00)
  CRITICAL_DIVERGENCE_PERCENT: new Decimal(
    process.env.ALERT_DIVERGENCE_CRITICAL || "20.00",
  ),
  HIGH_DIVERGENCE_PERCENT: new Decimal(
    process.env.ALERT_DIVERGENCE_HIGH || "10.00",
  ),
  MEDIUM_DIVERGENCE_PERCENT: new Decimal(
    process.env.ALERT_DIVERGENCE_MEDIUM || "5.00",
  ),
};

/**
 * Pure function: Determines whether a PriceAnalysis record requires an Alert.
 *
 * @param {object} priceAnalysis
 * @returns {boolean}
 */
export const shouldCreateAlert = (priceAnalysis) => {
  if (!priceAnalysis || !priceAnalysis.action) {
    return false;
  }

  // Actionable price anomalies require alerts
  if (
    priceAnalysis.action === "PRICE_DOWN" ||
    priceAnalysis.action === "PRICE_UP" ||
    priceAnalysis.action === "REVIEW"
  ) {
    return true;
  }

  return false;
};

/**
 * Pure function: Determines the severity of an alert based on PriceIndex divergence from target.
 *
 * @param {object} priceAnalysis
 * @returns {"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"}
 */
export const determineAlertSeverity = (priceAnalysis) => {
  const { action, priceIndex, targetIndex } = priceAnalysis;

  if (action === "REVIEW" && !priceIndex) {
    return "MEDIUM";
  }

  if (!priceIndex) {
    return "LOW";
  }

  const index = new Decimal(priceIndex);
  const target = targetIndex ? new Decimal(targetIndex) : new Decimal("100.00");
  const divergence = index.minus(target).abs();

  if (
    divergence.greaterThanOrEqualTo(ALERT_CONFIG.CRITICAL_DIVERGENCE_PERCENT)
  ) {
    return "CRITICAL";
  }

  if (divergence.greaterThanOrEqualTo(ALERT_CONFIG.HIGH_DIVERGENCE_PERCENT)) {
    return "HIGH";
  }

  if (divergence.greaterThanOrEqualTo(ALERT_CONFIG.MEDIUM_DIVERGENCE_PERCENT)) {
    return "MEDIUM";
  }

  return "LOW";
};

/**
 * Pure function: Builds an objective, descriptive message for the Alert.
 *
 * @param {object} priceAnalysis
 * @param {object} product
 * @param {object} surveyPeriod
 * @returns {string}
 */
export const buildAlertMessage = ({ priceAnalysis, product, surveyPeriod }) => {
  const productName = product?.name || priceAnalysis.productId;
  const periodName = surveyPeriod?.name || priceAnalysis.surveyPeriodId;
  const qPrice = priceAnalysis.queensPrice
    ? Number(priceAnalysis.queensPrice)
    : "N/A";
  const compPrice =
    priceAnalysis.minimumCompetitorPrice !== null &&
    priceAnalysis.minimumCompetitorPrice !== undefined
      ? Number(priceAnalysis.minimumCompetitorPrice)
      : priceAnalysis.competitorAveragePrice !== null &&
          priceAnalysis.competitorAveragePrice !== undefined
        ? Number(priceAnalysis.competitorAveragePrice)
        : "N/A";
  const pIndex =
    priceAnalysis.priceIndex !== null && priceAnalysis.priceIndex !== undefined
      ? Number(priceAnalysis.priceIndex)
      : "N/A";

  switch (priceAnalysis.action) {
    case "PRICE_DOWN":
      return `Price reduction recommended for [${productName}] in [${periodName}]. Queens benchmark (${qPrice}) is higher than competitor benchmark (${compPrice}) with price index of ${pIndex}.`;
    case "PRICE_UP":
      return `Price increase opportunity for [${productName}] in [${periodName}]. Queens benchmark (${qPrice}) is significantly below competitor benchmark (${compPrice}) with price index of ${pIndex}.`;
    case "REVIEW":
      return `Market review required for [${productName}] in [${periodName}]. Competitor benchmark data requires supervisor verification.`;
    default:
      return `Price condition alert triggered for [${productName}] in [${periodName}]. Action: ${priceAnalysis.action}.`;
  }
};

/**
 * Formats an Alert Prisma model into a clean JSON response DTO.
 */
export const formatAlertResponse = (alert) => {
  if (!alert) return null;

  return {
    id: alert.id,
    productId: alert.productId,
    surveyPeriodId: alert.surveyPeriodId,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    queensPrice: alert.queensPrice !== null ? Number(alert.queensPrice) : null,
    competitorPrice:
      alert.competitorPrice !== null ? Number(alert.competitorPrice) : null,
    priceIndex: alert.priceIndex !== null ? Number(alert.priceIndex) : null,
    resolved: alert.resolved,
    resolvedAt: alert.resolvedAt,
    resolutionNote: alert.resolutionNote,
    resolvedBy: alert.resolvedBy
      ? {
          id: alert.resolvedBy.id,
          name: alert.resolvedBy.name,
          email: alert.resolvedBy.email,
          role: alert.resolvedBy.role,
        }
      : null,
    product: alert.product
      ? {
          id: alert.product.id,
          name: alert.product.name,
          sku: alert.product.sku,
          category: alert.product.category,
          unit: alert.product.unit,
        }
      : undefined,
    surveyPeriod: alert.surveyPeriod
      ? {
          id: alert.surveyPeriod.id,
          name: alert.surveyPeriod.name,
          startDate: alert.surveyPeriod.startDate,
          endDate: alert.surveyPeriod.endDate,
          status: alert.surveyPeriod.status,
        }
      : undefined,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  };
};
