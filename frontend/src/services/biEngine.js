import { calculatePriceAction, calculateAverage } from "@/utils/calculations.js";

/**
 * Processes raw survey entries through the BI pipeline:
 * Validate -> Group by Item & Competitor -> Competitor Average -> Cheapest Benchmark -> Price Action
 */
export function computeBIResults(products = [], competitors = [], surveyEntries = [], surveyPeriodId = null) {
  // 1. Filter entries for the selected survey period if supplied
  const activeEntries = surveyPeriodId
    ? surveyEntries.filter((e) => e.surveyPeriodId === surveyPeriodId || !e.surveyPeriodId)
    : surveyEntries;

  return products.map((product) => {
    // Collect all entries for this specific product
    const productEntries = activeEntries.filter((e) => e.itemId === product.id);

    // Group submitted prices by competitor
    const competitorPriceMap = {};
    productEntries.forEach((entry) => {
      if (!competitorPriceMap[entry.competitorId]) {
        competitorPriceMap[entry.competitorId] = [];
      }
      if (entry.price && entry.price > 0) {
        competitorPriceMap[entry.competitorId].push(entry.price);
      }
    });

    // Calculate competitor averages
    const competitorAverages = Object.entries(competitorPriceMap).map(([compId, prices]) => {
      const comp = competitors.find((c) => c.id === compId);
      return {
        competitorId: compId,
        competitorName: comp ? comp.name : compId,
        market: comp ? comp.market : "Market",
        averagePrice: calculateAverage(prices),
        samplesCount: prices.length,
      };
    });

    // Determine the cheapest competitor average
    let cheapest = null;
    if (competitorAverages.length > 0) {
      cheapest = competitorAverages.reduce((min, curr) =>
        curr.averagePrice < min.averagePrice ? curr : min
      );
    }

    // Run action rule if benchmark exists
    const actionResult = cheapest
      ? calculatePriceAction(product.queensPrice, cheapest.averagePrice)
      : { index: 1.0, indexPercent: 100, variancePercent: 0, action: "PENDING" };

    return {
      itemId: product.id,
      itemName: product.name,
      category: product.category,
      unit: product.unit || "kg",
      queensPrice: product.queensPrice,
      hasData: Boolean(cheapest),
      competitorAverages,
      cheapestCompetitor: cheapest
        ? {
            competitorId: cheapest.competitorId,
            competitorName: cheapest.competitorName,
            averagePrice: cheapest.averagePrice,
          }
        : null,
      priceIndex: actionResult.index,
      priceIndexPercent: actionResult.indexPercent,
      variancePercent: actionResult.variancePercent,
      action: cheapest ? actionResult.action : "PENDING",
    };
  });
}

/**
 * Aggregates KPI indicators for the Executive Dashboard
 */
export function generateDashboardSummary(biResults = [], targetIndex = 0.95) {
  const totalItems = biResults.length;
  const surveyedItemsList = biResults.filter((r) => r.hasData);
  const surveyedItems = surveyedItemsList.length;

  let priceDownCount = 0;
  let priceUpCount = 0;
  let keepCount = 0;
  let pendingCount = 0;

  biResults.forEach((r) => {
    if (r.action === "PRICE_DOWN") priceDownCount++;
    else if (r.action === "PRICE_UP") priceUpCount++;
    else if (r.action === "KEEP") keepCount++;
    else pendingCount++;
  });

  const overallPriceIndex =
    surveyedItems > 0
      ? calculateAverage(surveyedItemsList.map((r) => r.priceIndex))
      : 1.0;

  const overallPriceIndexPercent = Number((overallPriceIndex * 100).toFixed(1));
  const targetIndexPercent = Number((targetIndex * 100).toFixed(1));

  const status = overallPriceIndex <= targetIndex ? "ON_TARGET" : "ATTENTION_REQUIRED";

  return {
    overallPriceIndex,
    overallPriceIndexPercent,
    targetIndex,
    targetIndexPercent,
    status,
    totalItems,
    surveyedItems,
    priceDownCount,
    priceUpCount,
    keepCount,
    pendingCount,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculates category-level price indexes
 */
export function generateCategorySummaries(biResults = [], targetIndex = 0.95) {
  const categoryMap = {};

  biResults.forEach((item) => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = [];
    }
    if (item.hasData) {
      categoryMap[item.category].push(item.priceIndex);
    }
  });

  return Object.entries(categoryMap).map(([category, indices]) => {
    const itemCount = indices.length;
    const avgIndex = itemCount > 0 ? calculateAverage(indices) : 1.0;
    const priceIndexPercent = Number((avgIndex * 100).toFixed(1));

    return {
      category,
      itemCount,
      priceIndex: avgIndex,
      priceIndexPercent,
      targetPercent: Number((targetIndex * 100).toFixed(1)),
      status: avgIndex <= targetIndex ? "ON_TARGET" : "ATTENTION_REQUIRED",
    };
  });
}

/**
 * Generates immediate action alerts for significant pricing variances
 */
export function generateAlerts(biResults = []) {
  return biResults
    .filter((r) => r.action === "PRICE_DOWN" || r.action === "PRICE_UP")
    .map((r, idx) => ({
      id: `ALT-00${idx + 1}`,
      itemId: r.itemId,
      itemName: r.itemName,
      type: r.action,
      severity: Math.abs(r.variancePercent) >= 10 ? "HIGH" : "MEDIUM",
      message:
        r.action === "PRICE_DOWN"
          ? `Queens price (${r.queensPrice.toFixed(2)}) is ${r.variancePercent}% above cheapest (${r.cheapestCompetitor.competitorName}: ${r.cheapestCompetitor.averagePrice.toFixed(2)}).`
          : `Queens price (${r.queensPrice.toFixed(2)}) is ${Math.abs(r.variancePercent)}% below cheapest (${r.cheapestCompetitor.competitorName}: ${r.cheapestCompetitor.averagePrice.toFixed(2)}).`,
      competitor: r.cheapestCompetitor.competitorName,
      competitorPrice: r.cheapestCompetitor.averagePrice,
      queensPrice: r.queensPrice,
      priceIndex: r.priceIndex,
      createdAt: new Date().toISOString(),
      resolved: false,
    }));
}