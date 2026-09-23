/**
 * Format a date to a human-readable string
 */
export const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
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
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
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
 * Format distance in meters to human-readable
 */
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
};

/**
 * Get status color classes
 */
export const getStatusColors = (status) => {
  switch (status) {
    case "COMPLETED":
      return {
        bg: "bg-emerald-50",
        text: "text-[#017C4D]",
        border: "border-emerald-200",
        dot: "bg-[#017C4D]",
      };
    case "IN_PROGRESS":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
      };
    case "NOT_STARTED":
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
    case "CANCELLED":
      return {
        bg: "bg-red-50",
        text: "text-[#A41821]",
        border: "border-red-200",
        dot: "bg-[#A41821]",
      };
    case "NEEDS_REVIEW":
      return {
        bg: "bg-amber-50",
        text: "text-[#FE7914]",
        border: "border-amber-200",
        dot: "bg-[#FE7914]",
      };
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
 * Get human-readable status label
 */
export const getStatusLabel = (status) => {
  const labels = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NEEDS_REVIEW: "Needs Review",
  };
  return labels[status] || status;
};

/**
 * Calculate audit completion percentage based on observations
 */
export const calculateAuditProgress = (audit) => {
  if (!audit?.assignment?.items?.length) return 0;
  const requiredItems = audit.assignment.items.filter((i) => i.required);
  if (requiredItems.length === 0) return 100;
  const observedCount = audit.observationsCount || 0;
  return Math.min(100, Math.round((observedCount / requiredItems.length) * 100));
};

/**
 * Check if GPS is valid for audit
 */
export const isGPSValid = (audit) => {
  return audit?.gps?.gpsValid === true;
};

/**
 * Get GPS status message
 */
export const getGPSStatusMessage = (audit) => {
  if (!audit?.gps?.start) return "GPS not captured";
  if (audit.gps.gpsValid === null) return "Store location not set";
  if (audit.gps.gpsValid === true) return "Location verified";
  return `Outside radius (${formatDistance(audit.gps.distanceFromStoreMeters)})`;
};
