export const calculatePriceAction = (queensPrice, competitorPrice) => {
    if (!competitorPrice || competitorPrice <= 0 || !queensPrice || queensPrice <= 0) {
        return { index: 1.0, indexPercent: 100, variancePercent: 0, action: "KEEP" };
    }

    const index = Number((queensPrice / competitorPrice).toFixed(3));
    const indexPercent = Number((index * 100).toFixed(1));
    const variancePercent = Number(((index - 1) * 100).toFixed(1));

    let action = "KEEP";
    if (index > 1.05) action = "PRICE_DOWN";
    else if (index < 0.95) action = "PRICE_UP";

    return { index, indexPercent, variancePercent, action };
};

export const calculateAverage = (nums = []) => {
    if (!nums.length) return 0;
    const sum = nums.reduce((acc, curr) => acc + Number(curr), 0);
    return Number((sum / nums.length).toFixed(2));
};

export const buildExcelRow = (item, periodId) => ({
    itemId: item.itemId,
    itemName: item.itemName,
    category: item.category,
    queensPrice: item.queensPrice,
    cheapestCompetitor: item.cheapestCompetitor ? item.cheapestCompetitor.competitorName : "N/A",
    cheapestCompetitorPrice: item.cheapestCompetitor ? item.cheapestCompetitor.averagePrice : 0,
    priceIndex: item.priceIndex,
    priceIndexPercent: `${item.priceIndexPercent}%`,
    action: item.action === "PRICE_DOWN" ? "Price Down" : item.action === "PRICE_UP" ? "Price Up" : "Keep",
    surveyPeriod: periodId || "Current",
});