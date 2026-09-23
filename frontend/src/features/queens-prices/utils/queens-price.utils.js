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
 * Format a date string for display (e.g., "Sep 1, 2026")
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
 * Format a date range as "Sep 1, 2026 → Oct 1, 2026" or "Sep 1, 2026 → Present"
 */
export const formatDateRange = (from, to) => {
  const fromStr = formatDate(from);
  const toStr = to ? formatDate(to) : "Present";
  return `${fromStr} → ${toStr}`;
};

/**
 * Format an ISO date string for use with <input type="date">
 */
export const toDateInputValue = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Convert a date input value (YYYY-MM-DD) to ISO string
 */
export const fromDateInputValue = (value) => {
  if (!value) return "";
  return new Date(`${value}T00:00:00.000Z`).toISOString();
};

/**
 * Determine the presentation status of a QueensPrice
 * Uses backend-provided status if available; otherwise computes.
 */
export const getQueensPriceStatus = (queensPrice) => {
  if (queensPrice?.status) return queensPrice.status;

  const now = new Date();
  const from = new Date(queensPrice.effectiveFrom);
  const to = queensPrice.effectiveTo ? new Date(queensPrice.effectiveTo) : null;

  if (from > now) return "FUTURE";
  if (to !== null && to <= now) return "HISTORICAL";
  return "CURRENT";
};

/**
 * Get a human-readable label for status
 */
export const getStatusLabel = (status) => {
  const labels = {
    CURRENT: "Current",
    HISTORICAL: "Historical",
    FUTURE: "Future",
  };
  return labels[status] || status;
};

/**
 * Get compact badge label for status
 */
export const getStatusBadgeLabel = (status) => {
  const labels = {
    CURRENT: "CURRENT",
    HISTORICAL: "HISTORICAL",
    FUTURE: "FUTURE",
  };
  return labels[status] || status;
};

/**
 * Get colors for a given status
 */
export const getStatusColors = (status) => {
  switch (status) {
    case "CURRENT":
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
        dot: "bg-[#017C4D]",
      };
    case "FUTURE":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
      };
    case "HISTORICAL":
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
  }
};

/**
 * Check if a candidate period overlaps with any existing period.
 * Mirrors backend periodsOverlap logic for client-side hints only.
 */
export const periodsOverlap = (startA, endA, startB, endB) => {
  const sA = new Date(startA).getTime();
  const eA = endA ? new Date(endA).getTime() : null;
  const sB = new Date(startB).getTime();
  const eB = endB ? new Date(endB).getTime() : null;

  const aStartsBeforeBEnds = eB === null || sA < eB;
  const aEndsAfterBStarts = eA === null || eA > sB;

  return aStartsBeforeBEnds && aEndsAfterBStarts;
};

/**
 * Find overlapping period in a list of existing QueensPrice records.
 * Used for optimistic frontend hinting — backend remains authoritative.
 */
export const findOverlappingPeriod = (candidate, existingRecords, excludeId = null) => {
  if (!candidate?.effectiveFrom) return null;
  const candidateFrom = candidate.effectiveFrom;
  const candidateTo = candidate.effectiveTo || null;

  return (
    existingRecords.find((record) => {
      if (excludeId && record.id === excludeId) return false;
      return periodsOverlap(candidateFrom, candidateTo, record.effectiveFrom, record.effectiveTo);
    }) || null
  );
};
