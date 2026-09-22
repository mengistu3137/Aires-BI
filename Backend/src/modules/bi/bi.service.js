import prisma from "../../config/db.js";
import { calculatePriceAction, calculateAverage, buildExcelRow } from "./bi.helpers.js";

export const getBIAnalytics = async ({ periodId, targetIndex = 0.95, category }) => {
    // 1. Fetch active catalog & competitors
    const productFilter = category ? { category, active: true } : { active: true };
    const products = await prisma.product.findMany({ where: productFilter });
    const competitors = await prisma.competitor.findMany({ where: { active: true } });

    // 2. Query collected entries
    const entryFilter = periodId ? { surveyPeriodId: periodId } : {};
    const entries = await prisma.surveyEntry.findMany({
        where: entryFilter,
        select: {
            itemId: true,
            competitorId: true,
            price: true,
            surveyPeriodId: true,
        },
    });

    // 3. Process competitor averages & cheapest competitor
    const biResults = products.map((product) => {
        const itemEntries = entries.filter((e) => e.itemId === product.id);

        const compPricesMap = {};
        itemEntries.forEach((entry) => {
            if (!compPricesMap[entry.competitorId]) compPricesMap[entry.competitorId] = [];
            compPricesMap[entry.competitorId].push(entry.price);
        });

        const competitorAverages = Object.entries(compPricesMap).map(([compId, prices]) => {
            const comp = competitors.find((c) => c.id === compId);
            return {
                competitorId: compId,
                competitorName: comp ? comp.name : compId,
                averagePrice: calculateAverage(prices),
                samplesCount: prices.length,
            };
        });

        let cheapest = null;
        if (competitorAverages.length > 0) {
            cheapest = competitorAverages.reduce((min, curr) =>
                curr.averagePrice < min.averagePrice ? curr : min
            );
        }

        const { index, indexPercent, variancePercent, action } = cheapest
            ? calculatePriceAction(product.queensPrice, cheapest.averagePrice)
            : { index: 1.0, indexPercent: 100, variancePercent: 0, action: "PENDING" };

        return {
            itemId: product.id,
            itemName: product.name,
            category: product.category,
            unit: product.unit,
            queensPrice: product.queensPrice,
            hasData: Boolean(cheapest),
            competitorAverages,
            cheapestCompetitor: cheapest,
            priceIndex: index,
            priceIndexPercent: indexPercent,
            variancePercent,
            action: cheapest ? action : "PENDING",
        };
    });

    // 4. Compute Executive KPI Summary
    const surveyedList = biResults.filter((r) => r.hasData);
    const overallPriceIndex = surveyedList.length > 0
        ? calculateAverage(surveyedList.map((r) => r.priceIndex))
        : 1.0;

    const dashboardSummary = {
        overallPriceIndex,
        overallPriceIndexPercent: Number((overallPriceIndex * 100).toFixed(1)),
        targetIndex,
        targetIndexPercent: Number((targetIndex * 100).toFixed(1)),
        status: overallPriceIndex <= targetIndex ? "ON_TARGET" : "ATTENTION_REQUIRED",
        totalItems: biResults.length,
        surveyedItems: surveyedList.length,
        priceDownCount: biResults.filter((r) => r.action === "PRICE_DOWN").length,
        priceUpCount: biResults.filter((r) => r.action === "PRICE_UP").length,
        keepCount: biResults.filter((r) => r.action === "KEEP").length,
        pendingCount: biResults.filter((r) => r.action === "PENDING").length,
        lastUpdated: new Date().toISOString(),
    };

    // 5. Category Indexes
    const categoryGroups = {};
    biResults.forEach((r) => {
        if (!categoryGroups[r.category]) categoryGroups[r.category] = [];
        if (r.hasData) categoryGroups[r.category].push(r.priceIndex);
    });

    const categorySummaries = Object.entries(categoryGroups).map(([cat, indices]) => {
        const avg = indices.length > 0 ? calculateAverage(indices) : 1.0;
        return {
            category: cat,
            itemCount: indices.length,
            priceIndex: avg,
            priceIndexPercent: Number((avg * 100).toFixed(1)),
            targetPercent: Number((targetIndex * 100).toFixed(1)),
            status: avg <= targetIndex ? "ON_TARGET" : "ATTENTION_REQUIRED",
        };
    });

    return {
        dashboardSummary,
        categorySummaries,
        biResults,
    };
};

export const getExportData = async (periodId) => {
    const { biResults } = await getBIAnalytics({ periodId });
    return biResults.map((item) => buildExcelRow(item, periodId));
};

export const biService = {
    getBIAnalytics,
    getExportData,
};