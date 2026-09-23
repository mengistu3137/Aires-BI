/**
 * Generate a stable client-side observation ID for offline idempotency.
 * Falls back to a timestamp+random string if crypto.randomUUID is unavailable.
 */
export const generateClientObservationId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / non-secure contexts
  return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * Format price with ETB currency
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined) return "—";
  const num = Number(price);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(2)} ETB`;
};

/**
 * Get human-readable availability label
 */
export const getAvailabilityLabel = (availability) => {
  const labels = {
    AVAILABLE: "Available",
    OUT_OF_STOCK: "Out of stock",
    NOT_FOUND: "Not found",
  };
  return labels[availability] || availability;
};

/**
 * Get compact availability label (for badges)
 */
export const getAvailabilityBadgeLabel = (availability) => {
  const labels = {
    AVAILABLE: "AVAILABLE",
    OUT_OF_STOCK: "OUT OF STOCK",
    NOT_FOUND: "NOT FOUND",
  };
  return labels[availability] || availability;
};

/**
 * Get colors for availability
 */
export const getAvailabilityColors = (availability) => {
  switch (availability) {
    case "AVAILABLE":
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
        dot: "bg-[#017C4D]",
        ring: "ring-emerald-500",
      };
    case "OUT_OF_STOCK":
      return {
        bg: "bg-red-50",
        text: "text-[#A41821]",
        border: "border-red-200",
        dot: "bg-[#A41821]",
        ring: "ring-red-500",
      };
    case "NOT_FOUND":
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
        dot: "bg-slate-400",
        ring: "ring-slate-400",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
        dot: "bg-slate-400",
        ring: "ring-slate-400",
      };
  }
};

/**
 * Get colors for review status
 */
export const getReviewStatusColors = (status) => {
  switch (status) {
    case "APPROVED":
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
      };
    case "REJECTED":
      return {
        bg: "bg-red-50",
        text: "text-[#A41821]",
        border: "border-red-200",
      };
    case "NEEDS_REVIEW":
      return {
        bg: "bg-amber-50",
        text: "text-[#FE7914]",
        border: "border-amber-200",
      };
    case "PENDING":
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
      };
  }
};

/**
 * Get human-readable review status label
 */
export const getReviewStatusLabel = (status) => {
  const labels = {
    PENDING: "Pending review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    NEEDS_REVIEW: "Needs review",
  };
  return labels[status] || status;
};

/**
 * Get colors for sync status
 */
export const getSyncStatusColors = (status) => {
  switch (status) {
    case "SYNCED":
      return {
        text: "text-[#017C4D]",
        dot: "bg-[#017C4D]",
      };
    case "SYNCING":
      return {
        text: "text-blue-700",
        dot: "bg-blue-500",
      };
    case "FAILED":
      return {
        text: "text-[#A41821]",
        dot: "bg-[#A41821]",
      };
    case "PENDING":
    default:
      return {
        text: "text-[#FE7914]",
        dot: "bg-[#FE7914]",
      };
  }
};

/**
 * Get human-readable sync status label
 */
export const getSyncStatusLabel = (status) => {
  const labels = {
    PENDING: "Pending sync",
    SYNCING: "Syncing",
    SYNCED: "Synced",
    FAILED: "Sync failed",
  };
  return labels[status] || status;
};

/**
 * Format observation timestamp
 */
export const formatCapturedAt = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format distance for GPS display
 */
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
};

/**
 * Get the latest observation for a product
 */
export const getLatestObservationForProduct = (observations, productId) => {
  const matching = observations.filter((o) => o.productId === productId);
  if (matching.length === 0) return null;
  return matching.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))[0];
};

/**
 * Check if product has been observed
 */
export const isProductObserved = (observations, productId) => {
  return observations.some((o) => o.productId === productId);
};
