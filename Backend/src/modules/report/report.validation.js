import { z } from "zod";
import { REPORT_TYPE_KEYS, normalizeReportType } from "./report.config.js";

/**
 * Query for all report endpoints:
 *   GET /reports/(summary|pdf|excel)?surveyPeriodId=...&reportType=...&storeId=...
 *
 * - surveyPeriodId is required.
 * - reportType is optional: FRESH_CORNER | ULTRA_SENSITIVE.
 *   Omit it (or send ALL) to get both reports in one document.
 * - storeId is optional. An empty value (?storeId=) is treated as "not provided".
 */
export const observationReportQuerySchema = z.object({
  surveyPeriodId: z
    .string({ required_error: "surveyPeriodId is required" })
    .trim()
    .min(1, "surveyPeriodId is required"),
  reportType: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizeReportType(value))
    .refine((value) => value !== null, {
      message: `reportType must be one of: ${REPORT_TYPE_KEYS.join(", ")} (omit it to get both)`,
    }),
  storeId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});
