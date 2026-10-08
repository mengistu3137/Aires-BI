import { z } from "zod";
import { REPORT_TYPE_KEYS, normalizeReportType } from "./report.config.js";

/**
 * Normalize a query value that may arrive as:
 *   - undefined / ""         → undefined
 *   - "a"                    → ["a"]
 *   - "a,b,c"                → ["a","b","c"]
 *   - ["a","b"]              → ["a","b"]
 * Each entry is trimmed; empty strings are dropped.
 */
const toIdArray = (value) => {
  if (value === undefined || value === null) return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const cleaned = raw
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
};

const idArraySchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => toIdArray(value));

export const observationReportQuerySchema = z.object({
  surveyPeriodId: idArraySchema,
  rangeType: z.enum(["WEEK", "MONTH", "CUSTOM", "PERIOD"]).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  reportType: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizeReportType(value))
    .refine((value) => value !== null, {
      message: `reportType must be one of: ${REPORT_TYPE_KEYS.join(", ")} (omit it to get both)`,
    }),
  storeId: idArraySchema,
  forceRefresh: z.coerce.boolean().optional(),
});