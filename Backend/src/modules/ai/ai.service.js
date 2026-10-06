import { groq, getActiveGroqModel } from "../../config/groq.js";
import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";

export const screenObservationAnomaly = async (observationId) => {
    const observation = await prisma.priceObservation.findUnique({
        where: { id: observationId },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    category: true,
                    unit: true,
                    sku: true,
                },
            },
            audit: {
                select: {
                    surveyPeriodId: true,
                    store: {
                        select: {
                            name: true,
                            area: true,
                            type: true,
                            competitor: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });

    if (!observation) {
        throw new ApiError(404, "Observation record not found");
    }

    const queensBenchmark = await prisma.queensPrice.findFirst({
        where: {
            productId: observation.productId,
            effectiveFrom: { lte: observation.capturedAt },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: observation.capturedAt } }],
        },
        orderBy: { effectiveFrom: "desc" },
    });

    const peerObservations = await prisma.priceObservation.findMany({
        where: {
            productId: observation.productId,
            audit: { surveyPeriodId: observation.audit.surveyPeriodId },
            availability: "AVAILABLE",
            price: { not: null, gt: 0 },
            id: { not: observation.id },
        },
        select: {
            price: true,
            audit: { select: { store: { select: { name: true } } } },
        },
    });

    const peerPrices = peerObservations.map((p) => ({
        store: p.audit?.store?.name,
        price: Number(p.price),
    }));

    const observedPrice = observation.price !== null ? Number(observation.price) : null;
    const benchmarkPrice = queensBenchmark ? Number(queensBenchmark.price) : null;

    if (observation.availability !== "AVAILABLE" || observedPrice === null) {
        return {
            isAnomaly: false,
            risk: "LOW",
            reason: `Product marked as ${observation.availability.replace("_", " ")}. No price deviation.`,
            suggestedReviewAction: "APPROVE",
        };
    }

    const prompt = `
You are the Chief Quality Assurance Inspector for Queens Supermarket PLC (MIDROC Investment Group / Carrefour Ethiopia).
Analyze this competitor shelf price observation collected by a field surveyor:

- Product: ${observation.product?.name} (Category: ${observation.product?.category}, Unit: ${observation.product?.unit})
- Competitor Store: ${observation.audit?.store?.name} (${observation.audit?.store?.competitor?.name})
- Field Observed Shelf Price: ${observedPrice} ETB
- Queen's Benchmark Baseline Price: ${benchmarkPrice ? `${benchmarkPrice} ETB` : "No baseline set"}
- Peer Competitor Prices in this Cycle: ${JSON.stringify(peerPrices)}

Identify:
1. Severe outliers (e.g. price > 50% above or below peers).
2. Suspected unit/decimal errors (e.g. quoting price per 100g instead of 1kg, or missing zero).
3. Wholesaler vs Retailer distortion.

Return strict JSON:
{
  "isAnomaly": boolean,
  "risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reason": "Clear 1-2 sentence explanation of the pricing deviation",
  "variancePercentage": number (relative to Queens benchmark or peers, e.g. -15.4 or +45.0),
  "suggestedReviewAction": "APPROVE" | "REQUEST_REVIEW" | "REJECT"
}
`;

    try {
        const model = await getActiveGroqModel("fast");

        const completion = await groq.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are an expert retail auditor. Always return valid, parseable JSON without commentary.",
                },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        return {
            observationId,
            observedPrice,
            queensBenchmark: benchmarkPrice,
            peerCount: peerPrices.length,
            ...parsed,
        };
    } catch (error) {
        console.error("[Groq AI] Observation screening failed:", error.message);
        return {
            isAnomaly: false,
            risk: "LOW",
            reason: "Automated AI screening temporarily unavailable. Review manually.",
            suggestedReviewAction: "APPROVE",
        };
    }
};

export const generateExecutivePriceBrief = async (analysisSummary) => {
    const prompt = `
You are the Chief Retail Pricing Strategist for Queens Supermarket / MIDROC Investment Group.
Generate a structured C-level executive pricing brief based on this verified market survey data:

${JSON.stringify(analysisSummary, null, 2)}

Structure your report into:
1. Executive Summary & Market Positioning
2. Negative Margin Warnings (Cost floor vs Retail shelf price)
3. Immediate Margin Recovery Opportunities (Underpriced items)
4. Fresh Produce Supply Chain & Stockout Action Plan

Use professional, decisive, executive-grade retail language.
`;

    try {
        const model = await getActiveGroqModel("reasoning");

        const completion = await groq.chat.completions.create({
            model,
            messages: [
                { role: "system", content: "You write high-level executive retail intelligence briefs." },
                { role: "user", content: prompt },
            ],
            temperature: 0.2,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("[Groq AI] Executive brief generation failed:", error.message);
        throw new ApiError(500, "Failed to generate executive brief from AI service.");
    }
};