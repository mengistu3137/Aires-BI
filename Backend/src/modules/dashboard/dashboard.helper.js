/**
 * Safely computes a completion percentage rate rounded to 2 decimal places.
 * Cancelled items are excluded from the denominator.
 *
 * @param {number} completed
 * @param {number} total
 * @param {number} cancelled
 * @returns {number}
 */
export const calculateCompletionRate = (
  completed = 0,
  total = 0,
  cancelled = 0,
) => {
  const eligible = total - cancelled;
  if (eligible <= 0) return 0;
  const rate = (completed / eligible) * 100;
  return Math.round(rate * 100) / 100;
};

/**
 * Normalizes Prisma groupBy results into standard key-value counters.
 *
 * @param {Array<object>} groupResults
 * @param {string} keyField
 * @param {Array<string>} expectedKeys
 * @returns {Record<string, number>}
 */
export const mapGroupByCounts = (
  groupResults = [],
  keyField,
  expectedKeys = [],
) => {
  const map = {};
  for (const key of expectedKeys) {
    map[key] = 0;
  }

  for (const item of groupResults) {
    const key = item[keyField];
    if (key !== null && key !== undefined) {
      map[key] = item._count?._all ?? item._count ?? 0;
    }
  }

  return map;
};

/**
 * Formats Decimal objects in alert records for clean response serialization.
 *
 * @param {object} alert
 * @returns {object}
 */
export const formatRecentAlertItem = (alert) => {
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
    createdAt: alert.createdAt,
    product: alert.product
      ? {
          id: alert.product.id,
          name: alert.product.name,
          sku: alert.product.sku,
          category: alert.product.category,
        }
      : undefined,
  };
};
