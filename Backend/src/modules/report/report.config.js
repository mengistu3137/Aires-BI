import { normalizeKey } from "./report.utils.js";

const FMCG_COLUMNS = [
  { key: "shoa", label: "Shoa", kind: "COMPETITOR", aliases: ["shoa"] },
  { key: "abadir", label: "Abadir", kind: "COMPETITOR", aliases: ["abadir"] },
  { key: "allmart", label: "Allmart", kind: "COMPETITOR", aliases: ["allmart"] },
  { key: "bambis", label: "Bambis", kind: "COMPETITOR", aliases: ["bambis", "bambi"] },
  { key: "queens-price", label: "Queens Price", kind: "QUEENS", aliases: [] },
];

const FRESH_COLUMNS = [
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
];

export const REPORT_TYPES = {
  DAILY: {
    key: "DAILY",
    slug: "daily-fresh",
    label: "Daily Fresh (20 Products)",
    description: "Daily volatile items: Vegetables, Fruits, Dairy, and Meat",
    acceptsProduct: (p) => p.frequency === "DAILY",
    columns: FRESH_COLUMNS,
  },

  WEEKLY: {
    key: "WEEKLY",
    slug: "weekly-ultra-sensitive",
    label: "Ultra-Sensitive (100 Articles)",
    description: "Core FMCG staples audited weekly",
    acceptsProduct: (p) => p.frequency === "WEEKLY",
    columns: FMCG_COLUMNS,
  },

  MONTHLY: {
    key: "MONTHLY",
    slug: "monthly-sensitive",
    label: "Sensitive (500 Articles)",
    description: "Secondary FMCG packaged goods audited monthly",
    acceptsProduct: (p) => p.frequency === "MONTHLY",
    columns: FMCG_COLUMNS,
  },

  BI_YEARLY: {
    key: "BI_YEARLY",
    slug: "bi-yearly-non-sensitive",
    label: "Non-Sensitive (2,804 Articles)",
    description: "Long-tail niche articles audited bi-yearly",
    acceptsProduct: (p) => p.frequency === "BI_YEARLY",
    columns: FMCG_COLUMNS,
  },
};

export const REPORT_TYPE_KEYS = ["DAILY", "WEEKLY", "MONTHLY", "BI_YEARLY"];

const TYPE_ALIASES = {
  FRESH: "DAILY",
  FRESH_CORNER: "DAILY",
  FRESHCORNER: "DAILY",
  DAILY_FRESH: "DAILY",
  ULTRA: "WEEKLY",
  ULTRA_SENSITIVE: "WEEKLY",
  ULTRASENSITIVE: "WEEKLY",
  SENSITIVE: "MONTHLY",
  NONSENSITIVE: "BI_YEARLY",
  NON_SENSITIVE: "BI_YEARLY",
  BIYEARLY: "BI_YEARLY",
};

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

export const CATEGORY_ORDER = {
  DAILY: [
    "Vegetables",
    "Fruits",
    "Fresh Produce",
    "Dairy",
    "Dairy products",
    "Meat",
    "Meat products",
    "Poultry",
  ],
  WEEKLY: ["Ultra-Sensitive", "Grocery", "Cooking Ingredients"],
  MONTHLY: ["Sensitive", "Personal Care", "Cleaning & Detergents", "Canned Food"],
  BI_YEARLY: ["Non-Sensitive"],
};