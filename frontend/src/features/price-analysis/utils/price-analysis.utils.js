/**
 * Format a price value as ETB currency string
 */
export const formatPrice = (price, currency = "ETB") => {
  if (price === null || price === undefined) return "—";
  const num = Number(price);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(2)} ${currency}`;
};

/**
 * Format an index value (Price Index / Target Index)
 * Index values are dimensionless; do NOT append %.
 */
export const formatIndex = (index) => {
  if (index === null || index === undefined) return "—";
  const num = Number(index);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(2);
};

/**
 * Format a date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format date + time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Get the human-readable label for a PriceAction
 */
export const getActionLabel = (action) => {
  const labels = {
    PRICE_DOWN: "Price down",
    PRICE_UP: "Price up",
    KEEP: "Keep",
    REVIEW: "Review",
  };
  return labels[action] || action || "Not determined";
};

/**
 * Get compact badge label for an action
 */
export const getActionBadgeLabel = (action) => {
  const labels = {
    PRICE_DOWN: "PRICE DOWN",
    PRICE_UP: "PRICE UP",
    KEEP: "KEEP",
    REVIEW: "REVIEW",
  };
  return labels[action] || "—";
};

/**
 * Get visual colors for a PriceAction
 */
export const getActionColors = (action) => {
  switch (action) {
    case "PRICE_DOWN":
      // Queens is more expensive than competitors — recommendation to lower price
      return {
        bg: "bg-red-50",
        text: "text-[#A41821]",
        border: "border-red-200",
        dot: "bg-[#A41821]",
        icon: "down",
      };
    case "PRICE_UP":
      // Queens is cheaper than competitors — opportunity to raise price
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
        dot: "bg-[#017C4D]",
        icon: "up",
      };
    case "KEEP":
      // Within tolerance band — maintain current price
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
        dot: "bg-slate-500",
        icon: "keep",
      };
    case "REVIEW":
      // Needs human review — insufficient data or out of band
      return {
        bg: "bg-amber-50",
        text: "text-[#FE7914]",
        border: "border-amber-200",
        dot: "bg-[#FE7914]",
        icon: "review",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-500",
        border: "border-slate-200",
        dot: "bg-slate-400",
        icon: "neutral",
      };
  }
};

/**
 * Compute the position of the price index relative to the target index and tolerance band.
 * Used only for visual comparison — does NOT recalculate backend logic.
 * Returns a normalized ratio in [0, 1] for a bar chart position.
 */
export const computeIndexPosition = ({ priceIndex, targetIndex, toleranceBand = 3 }) => {
  if (priceIndex === null || priceIndex === undefined || !targetIndex) {
    return null;
  }
  const index = Number(priceIndex);
  const target = Number(targetIndex);
  if (Number.isNaN(index) || Number.isNaN(target)) return null;

  const lowerBand = target - toleranceBand;
  const upperBand = target + toleranceBand;

  // Normalize against a wider display range for visualization
  const minDisplay = Math.min(lowerBand - 5, index - 2);
  const maxDisplay = Math.max(upperBand + 5, index + 2);
  const range = maxDisplay - minDisplay || 1;

  return {
    indexRatio: (index - minDisplay) / range,
    lowerBandRatio: (lowerBand - minDisplay) / range,
    upperBandRatio: (upperBand - minDisplay) / range,
    targetRatio: (target - minDisplay) / range,
  };
};

/**
 * Get display status for an analysis record.
 * Analysis records are always "calculated" — they don't have a
 * lifecycle like audits or observations.
 */
export const getAnalysisStatusLabel = (analysis) => {
  if (!analysis) return "Not available";
  if (analysis.action === null) return "Not determined";
  return getActionLabel(analysis.action);
};

/**
 * Format a captured-at timestamp (short form with time).
 * Matches the observation module's convention.
 */
export const formatCapturedAt = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
