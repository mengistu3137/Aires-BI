/**
 * Core Price Action Calculation
 * Formula: Price Index = Queens Price / Cheapest Competitor Price
 * 
 * Thresholds:
 * - Index > 1.05 (Queens is >5% more expensive) -> PRICE_DOWN
 * - Index < 0.95 (Queens is >5% cheaper)        -> PRICE_UP
 * - 0.95 <= Index <= 1.05                      -> KEEP
 */
export function calculatePriceAction(queensPrice, competitorPrice) {
  if (!competitorPrice || competitorPrice <= 0 || !queensPrice || queensPrice <= 0) {
    return {
      index: 1.0,
      indexPercent: 100,
      variancePercent: 0,
      action: "KEEP",
    };
  }

  const index = Number((queensPrice / competitorPrice).toFixed(3));
  const indexPercent = Number((index * 100).toFixed(1));
  const variancePercent = Number(((index - 1) * 100).toFixed(1));

  let action = "KEEP";
  if (index > 1.05) {
    action = "PRICE_DOWN";
  } else if (index < 0.95) {
    action = "PRICE_UP";
  }

  return {
    index,
    indexPercent,
    variancePercent,
    action,
  };
}

/**
 * Calculates arithmetic average of an array of numbers
 */
export function calculateAverage(numbers = []) {
  if (!numbers.length) return 0;
  const sum = numbers.reduce((acc, curr) => acc + Number(curr), 0);
  return Number((sum / numbers.length).toFixed(2));
}