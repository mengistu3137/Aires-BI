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
 * Format an index value (Price Index) — dimensionless
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
 * Format a date with time
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
 * Relative time formatting for recent activity
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
 * Human-readable label for an alert type (PriceAction)
 */
export const getAlertTypeLabel = (type) => {
  const labels = {
    PRICE_DOWN: "Price decrease",
    PRICE_UP: "Price increase",
    KEEP: "Keep price",
    REVIEW: "Review",
  };
  return labels[type] || type || "—";
};

/**
 * Compact badge label for an alert type
 */
export const getAlertTypeBadgeLabel = (type) => {
  const labels = {
    PRICE_DOWN: "PRICE DOWN",
    PRICE_UP: "PRICE UP",
    KEEP: "KEEP",
    REVIEW: "REVIEW",
  };
  return labels[type] || "—";
};

/**
 * Colors for an alert type badge
 */
export const getAlertTypeColors = (type) => {
  switch (type) {
    case "PRICE_DOWN":
      return {
        bg: "bg-red-50",
        text: "text-[#A41821]",
        border: "border-red-200",
        dot: "bg-[#A41821]",
      };
    case "PRICE_UP":
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
        dot: "bg-[#017C4D]",
      };
    case "KEEP":
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
        dot: "bg-slate-500",
      };
    case "REVIEW":
      return {
        bg: "bg-amber-50",
        text: "text-[#FE7914]",
        border: "border-amber-200",
        dot: "bg-[#FE7914]",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-500",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
  }
};

/**
 * Human-readable label for severity
 */
export const getSeverityLabel = (severity) => {
  const labels = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };
  return labels[severity] || severity || "—";
};

/**
 * Badge label for severity
 */
export const getSeverityBadgeLabel = (severity) => {
  const labels = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  };
  return labels[severity] || "—";
};

/**
 * Colors for severity badge
 */
export const getSeverityColors = (severity) => {
  switch (severity) {
    case "CRITICAL":
      return {
        bg: "bg-red-50",
        text: "text-[#A41821]",
        border: "border-red-200",
        dot: "bg-[#A41821]",
      };
    case "HIGH":
      return {
        bg: "bg-amber-50",
        text: "text-[#FE7914]",
        border: "border-amber-200",
        dot: "bg-[#FE7914]",
      };
    case "MEDIUM":
      return {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        dot: "bg-yellow-500",
      };
    case "LOW":
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
 * Order severity for sorting/presentation
 */
export const SEVERITY_RANK = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Get status badge label for resolved/unresolved
 */
export const getStatusLabel = (resolved) => (resolved ? "Resolved" : "Unresolved");

/**
 * Get status badge compact label
 */
export const getStatusBadgeLabel = (resolved) => (resolved ? "RESOLVED" : "UNRESOLVED");

/**
 * Colors for status badge
 */
export const getStatusColors = (resolved) => {
  if (resolved) {
    return {
      bg: "bg-emerald-50",
      text: "text-[#017C4D]",
      border: "border-emerald-200",
      dot: "bg-[#017C4D]",
    };
  }
  return {
    bg: "bg-red-50",
    text: "text-[#A41821]",
    border: "border-red-200",
    dot: "bg-[#A41821]",
  };
};
