/**
 * Shared helpers for the observation report (PDF + Excel).
 *
 * Optional environment variables:
 *   REPORT_CURRENCY  - currency label shown in reports (default "ETB")
 *   REPORT_TIMEZONE  - IANA timezone used for dates (default "Africa/Addis_Ababa")
 */
export const CURRENCY = process.env.REPORT_CURRENCY || "ETB";
export const REPORT_TIMEZONE =
  process.env.REPORT_TIMEZONE || "Africa/Addis_Ababa";

export const AVAILABILITY_LABELS = {
  AVAILABLE: "Available",
  OUT_OF_STOCK: "Out of stock",
  NOT_FOUND: "Not found",
};

export const REVIEW_LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  NEEDS_REVIEW: "Needs review",
  REJECTED: "Rejected",
};

export const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REPORT_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REPORT_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDate = (value) =>
  value ? dateFormatter.format(new Date(value)) : "";

export const formatDateTime = (value) =>
  value ? dateTimeFormatter.format(new Date(value)) : "";

export const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase() || "report";

/** "Competitor" sub-label for a store column header, avoiding duplicates. */
export const storeHeaderLabel = (store) => {
  const competitor = store.competitorName || "";
  if (
    competitor &&
    !store.name.toLowerCase().includes(competitor.toLowerCase())
  ) {
    return `${store.name}\n${competitor}`;
  }
  return store.name;
};
