/**
 * Safe number formatting
 */
export const formatNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return num;
};

/**
 * Format a price as ETB — matches other modules.
 */
export const formatPrice = (price, currency = "ETB") => {
  if (price === null || price === undefined) return "—";
  const num = Number(price);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(2)} ${currency}`;
};

/**
 * Format an index value (dimensionless — no % sign).
 * Matches Price Analysis convention.
 */
export const formatIndex = (index) => {
  if (index === null || index === undefined) return "—";
  const num = Number(index);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(2);
};

/**
 * Format completion rate. Backend already returns rounded percentage (e.g. 68.5).
 */
export const formatCompletionRate = (rate) => {
  if (rate === null || rate === undefined) return "—";
  const num = Number(rate);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
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
 * Relative time formatting
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

/**
 * Human-readable label for a price action
 */
export const getPriceActionLabel = (action) => {
  const labels = {
    PRICE_DOWN: "Price decrease",
    PRICE_UP: "Price increase",
    KEEP: "Keep price",
    REVIEW: "Review",
  };
  return labels[action] || action || "—";
};

/**
 * Colors for a price action — matches Price Analysis feature
 */
export const getPriceActionColors = (action) => {
  switch (action) {
    case "PRICE_DOWN":
      return { bg: "bg-red-50", text: "text-[#A41821]", dot: "bg-[#A41821]" };
    case "PRICE_UP":
      return { bg: "bg-emerald-50", text: "text-[#017C4D]", dot: "bg-[#017C4D]" };
    case "KEEP":
      return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" };
    case "REVIEW":
      return { bg: "bg-amber-50", text: "text-[#FE7914]", dot: "bg-[#FE7914]" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" };
  }
};

/**
 * Colors for alert severity — matches Alerts feature
 */
export const getSeverityColors = (severity) => {
  switch (severity) {
    case "CRITICAL":
      return { bg: "bg-red-50", text: "text-[#A41821]", dot: "bg-[#A41821]" };
    case "HIGH":
      return { bg: "bg-amber-50", text: "text-[#FE7914]", dot: "bg-[#FE7914]" };
    case "MEDIUM":
      return { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" };
    case "LOW":
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  }
};

/**
 * Colors for survey period status
 */
export const getSurveyPeriodStatusColors = (status) => {
  switch (status) {
    case "OPEN":
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
        dot: "bg-[#017C4D]",
      };
    case "DRAFT":
      return {
        bg: "bg-amber-50",
        text: "text-[#FE7914]",
        border: "border-amber-200",
        dot: "bg-[#FE7914]",
      };
    case "CLOSED":
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
 * Human-readable label for audit status
 */
export const getAuditStatusLabel = (status) => {
  const labels = {
    NOT_STARTED: "Not started",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NEEDS_REVIEW: "Needs review",
  };
  return labels[status] || status;
};
