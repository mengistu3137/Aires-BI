import { normalizeKey } from "./report.utils.js";

/**
 * Report layout configuration.
 *
 * The export is split in two report types. Each one has its own fixed list of
 * columns (one column per COMPETITOR, all stores of that competitor combined):
 *
 *   FRESH_CORNER     -> every category that is NOT "Ultra-Sensitive"
 *                       Fresh Corner | Garment Market | Straight Market | Queens Price
 *   ULTRA_SENSITIVE  -> only the "Ultra-Sensitive" category
 *                       Shoa | Abadir | Allmart | Bambis
 *
 * Column kinds:
 *   COMPETITOR - prices come from audit observations. A store belongs to the
 *                column when its Competitor.name matches one of the `aliases`
 *                (compared case-insensitively, ignoring spaces/punctuation,
 *                and the alias may be contained in the competitor name).
 *   QUEENS     - our own price; taken from the QueensPrice table (the price
 *                that is effective right now).
 *
 * A column with no data (e.g. Bambis today) is still shown, with blank cells.
 * If a competitor is named differently in your database, add the spelling to
 * its `aliases` list below.
 */

export const isUltraSensitiveCategory = (category) =>
  normalizeKey(category) === "ultrasensitive";

export const REPORT_TYPES = {
  FRESH_CORNER: {
    key: "FRESH_CORNER",
    slug: "fresh-corner",
    label: "Fresh Corner",
    description: "All categories except Ultra-Sensitive",
    acceptsCategory: (category) => !isUltraSensitiveCategory(category),
    columns: [
      {
        key: "fresh-corner",
        label: "Fresh Corner",
        kind: "COMPETITOR",
        aliases: ["freshcorner"],
      },
      {
        key: "garment-market",
        label: "Garment Market",
        kind: "COMPETITOR",
        aliases: ["garmentmarket", "garment"],
      },
      {
        key: "straight-market",
        label: "Straight Market",
        kind: "COMPETITOR",
        aliases: ["straightmarket", "straight"],
      },
      {
        key: "queens-price",
        label: "Queens Price",
        kind: "QUEENS",
        aliases: [],
      },
    ],
  },

  ULTRA_SENSITIVE: {
    key: "ULTRA_SENSITIVE",
    slug: "ultra-sensitive",
    label: "Ultra-Sensitive",
    description: "Ultra-Sensitive category only",
    acceptsCategory: (category) => isUltraSensitiveCategory(category),
    columns: [
      { key: "shoa", label: "Shoa", kind: "COMPETITOR", aliases: ["shoa"] },
      {
        key: "abadir",
        label: "Abadir",
        kind: "COMPETITOR",
        aliases: ["abadir"],
      },
      {
        key: "allmart",
        label: "Allmart",
        kind: "COMPETITOR",
        aliases: ["allmart"],
      },
      {
        key: "bambis",
        label: "Bambis",
        kind: "COMPETITOR",
        aliases: ["bambis", "bambi"],
      },
    ],
  },
};

export const REPORT_TYPE_KEYS = Object.keys(REPORT_TYPES);

const TYPE_ALIASES = {
  FRESH: "FRESH_CORNER",
  FRESHCORNER: "FRESH_CORNER",
  ULTRA: "ULTRA_SENSITIVE",
  ULTRASENSITIVE: "ULTRA_SENSITIVE",
};

/**
 * Normalises the `reportType` query value.
 *   - undefined -> both reports (empty / "ALL" / "BOTH")
 *   - a key     -> that report only
 *   - null      -> invalid value
 */
export const normalizeReportType = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (!raw || raw === "ALL" || raw === "BOTH") return undefined;
  if (REPORT_TYPES[raw]) return raw;
  if (TYPE_ALIASES[raw]) return TYPE_ALIASES[raw];
  return null;
};

/** Finds the COMPETITOR column a competitor name belongs to (or null). */
export const matchColumn = (columns, competitorName) => {
  const name = normalizeKey(competitorName);
  if (!name) return null;
  return (
    columns.find(
      (column) =>
        column.kind === "COMPETITOR" &&
        column.aliases.some((alias) => name.includes(alias)),
    ) || null
  );
};
