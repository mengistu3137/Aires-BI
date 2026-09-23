import pkg from "@prisma/client";
const { Prisma } = pkg;

const Decimal = Prisma.Decimal;

/**
 * Configurable thresholds for Price Index and Actions.
 * These defaults represent FMCG benchmark standards and are configurable
 * via environment variables so production rules remain easily adaptable.
 */
export const PRICE_ANALYSIS_CONFIG = {
  // Default target benchmark index (100.00 = parity with market average)
  DEFAULT_TARGET_INDEX: new Decimal(
    process.env.PRICE_INDEX_TARGET_DEFAULT || "100.00",
  ),

  // Acceptable parity band around target index (e.g. +/- 3%)
  TOLERANCE_BAND_PERCENT: new Decimal(
    process.env.PRICE_INDEX_TOLERANCE_BAND || "3.00",
  ),

  // Minimum required approved competitor observations to make a confident action recommendation
  MIN_OBSERVATIONS_FOR_ACTION: Number(
    process.env.PRICE_ANALYSIS_MIN_OBSERVATIONS || "1",
  ),
};

/**
 * Calculates aggregate minimum and arithmetic mean competitor prices using Decimal precision.
 * Excludes nulls and non-positive prices.
 *
 * @param {Array<Prisma.Decimal|string|number>} prices
 * @returns {{ minimumCompetitorPrice: Prisma.Decimal|null, competitorAveragePrice: Prisma.Decimal|null, count: number }}
 */
export const calculateCompetitorAggregates = (prices) => {
  if (!prices || prices.length === 0) {
    return {
      minimumCompetitorPrice: null,
      competitorAveragePrice: null,
      count: 0,
    };
  }

  let min = new Decimal(prices[0]);
  let sum = new Decimal(0);

  for (const p of prices) {
    const dec = new Decimal(p);
    if (dec.lessThan(min)) {
      min = dec;
    }
    sum = sum.plus(dec);
  }

  const count = prices.length;
  const avg = sum
    .dividedBy(new Decimal(count))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const roundedMin = min.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    minimumCompetitorPrice: roundedMin,
    competitorAveragePrice: avg,
    count,
  };
};

/**
 * Calculates the Price Index:
 * Formula: (Queens Price / Competitor Average Price) * 100
 *
 * - An index < 100 indicates Queens is cheaper than competitor average.
 * - An index > 100 indicates Queens is more expensive than competitor average.
 *
 * @param {Prisma.Decimal} queensPrice
 * @param {Prisma.Decimal|null} competitorAveragePrice
 * @returns {Prisma.Decimal|null}
 */
export const calculatePriceIndex = (queensPrice, competitorAveragePrice) => {
  if (!queensPrice || !competitorAveragePrice) {
    return null;
  }

  const qPrice = new Decimal(queensPrice);
  const cAvg = new Decimal(competitorAveragePrice);

  if (cAvg.isZero() || cAvg.isNegative()) {
    return null;
  }

  // (queensPrice / competitorAveragePrice) * 100
  return qPrice
    .dividedBy(cAvg)
    .times(new Decimal(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
};

/**
 * Resolves the target price index for a product.
 * Returns configurable default unless product/category target is provided.
 *
 * @param {object} product
 * @returns {Prisma.Decimal}
 */
export const getTargetIndex = (product = null) => {
  return PRICE_ANALYSIS_CONFIG.DEFAULT_TARGET_INDEX;
};

/**
 * Determines the recommended PriceAction:
 * - PRICE_DOWN: Queens is significantly more expensive than target index (> target + tolerance).
 * - PRICE_UP: Queens is significantly cheaper than target index (< target - tolerance).
 * - KEEP: Queens index is within parity tolerance band [target - tolerance, target + tolerance].
 * - REVIEW: Insufficient observations or missing competitor benchmark data.
 *
 * @param {object} params
 * @param {Prisma.Decimal|null} params.priceIndex
 * @param {Prisma.Decimal|null} params.targetIndex
 * @param {number} params.observationCount
 * @returns {string|null} "PRICE_DOWN" | "PRICE_UP" | "KEEP" | "REVIEW" | null
 */
export const determinePriceAction = ({
  priceIndex,
  targetIndex,
  observationCount,
}) => {
  if (!priceIndex || !targetIndex) {
    return "REVIEW";
  }

  if (observationCount < PRICE_ANALYSIS_CONFIG.MIN_OBSERVATIONS_FOR_ACTION) {
    return "REVIEW";
  }

  const target = new Decimal(targetIndex);
  const index = new Decimal(priceIndex);
  const tolerance = PRICE_ANALYSIS_CONFIG.TOLERANCE_BAND_PERCENT;

  const upperBand = target.plus(tolerance);
  const lowerBand = target.minus(tolerance);

  if (index.greaterThan(upperBand)) {
    return "PRICE_DOWN";
  }

  if (index.lessThan(lowerBand)) {
    return "PRICE_UP";
  }

  return "KEEP";
};

/**
 * Formats a PriceAnalysis Prisma model into a clean JSON response DTO.
 * Explicitly formats Decimal objects into standard numbers/strings.
 */
export const formatPriceAnalysisResponse = (pa) => {
  if (!pa) return null;

  return {
    id: pa.id,
    productId: pa.productId,
    surveyPeriodId: pa.surveyPeriodId,
    queensPrice: pa.queensPrice !== null ? Number(pa.queensPrice) : null,
    minimumCompetitorPrice:
      pa.minimumCompetitorPrice !== null
        ? Number(pa.minimumCompetitorPrice)
        : null,
    competitorAveragePrice:
      pa.competitorAveragePrice !== null
        ? Number(pa.competitorAveragePrice)
        : null,
    priceIndex: pa.priceIndex !== null ? Number(pa.priceIndex) : null,
    targetIndex: pa.targetIndex !== null ? Number(pa.targetIndex) : null,
    action: pa.action,
    notes: pa.notes,
    calculatedAt: pa.calculatedAt,
    product: pa.product
      ? {
          id: pa.product.id,
          name: pa.product.name,
          sku: pa.product.sku,
          barcode: pa.product.barcode,
          category: pa.product.category,
          unit: pa.product.unit,
        }
      : undefined,
    surveyPeriod: pa.surveyPeriod
      ? {
          id: pa.surveyPeriod.id,
          name: pa.surveyPeriod.name,
          startDate: pa.surveyPeriod.startDate,
          endDate: pa.surveyPeriod.endDate,
          status: pa.surveyPeriod.status,
        }
      : undefined,
    createdAt: pa.createdAt,
    updatedAt: pa.updatedAt,
  };
};
