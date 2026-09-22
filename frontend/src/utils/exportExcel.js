/**
 * Generates and downloads a flat CSV file matching the Excel export specification
 */
export const downloadBIExcelExport = (biResults = [], periodId = "2026-W39") => {
    if (!biResults.length) return;

    const headers = [
        "Item ID",
        "Item Name",
        "Category",
        "Queens Price (ETB)",
        "Cheapest Competitor",
        "Cheapest Price (ETB)",
        "Price Index",
        "Price Index %",
        "Action",
        "Survey Period",
    ];

    const rows = biResults.map((r) => [
        r.itemId,
        `"${r.itemName.replace(/"/g, '""')}"`,
        `"${r.category}"`,
        r.queensPrice.toFixed(2),
        r.cheapestCompetitor ? `"${r.cheapestCompetitor.competitorName}"` : "N/A",
        r.cheapestCompetitor ? r.cheapestCompetitor.averagePrice.toFixed(2) : "0.00",
        r.priceIndex.toFixed(3),
        `${r.priceIndexPercent}%`,
        r.action === "PRICE_DOWN" ? "Price Down" : r.action === "PRICE_UP" ? "Price Up" : "Keep",
        periodId,
    ]);

    const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aires-BI-Pricing-Report-${periodId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};