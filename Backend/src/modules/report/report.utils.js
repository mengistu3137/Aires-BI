/**
 * Shared helpers for the observation report (PDF + Excel + Word).
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
export const formatProductName = (name) => {
  if (!name || typeof name !== "string") return "";

  const minorWords = new Set(["with", "and", "or", "in", "on", "at", "to", "for", "of", "by"]);

  return name
    .toLowerCase()
    .replace(/[a-z0-9/()*'-]+/gi, (match, offset) => {   // (match, offset) is correct without a capture group
      const lower = match.toLowerCase();

      const unitMatch = match.match(/^(\d+(?:\/\d+)?)(gm|g|kg|ml|l|ltr|pcs|pack|gr)$/i);
      if (unitMatch) {
        const u = unitMatch[2].toLowerCase();
        const normUnit = u === "gm" || u === "gr" ? "g" : u === "ltr" ? "L" : u === "l" ? "L" : u;
        return `${unitMatch[1]}${normUnit}`;
      }

      if (offset > 0 && minorWords.has(lower)) return lower;
      return match.charAt(0).toUpperCase() + match.slice(1);
    })
    .replace(/\s+/g, " ")
    .trim();
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

/**
 * Lower-cases and strips everything except letters/digits so that
 * "Ultra-Sensitive", "ultra sensitive" and "ULTRA_SENSITIVE" compare equal.
 */
export const normalizeKey = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Column header text for a report column (competitor or Queens Price). */
export const columnHeaderLabel = (column) =>
  column.kind === "QUEENS" ? `${column.label}\n(current)` : column.label;