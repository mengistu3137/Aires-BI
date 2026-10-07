import { z } from "zod";
import { REPORT_TYPE_KEYS, normalizeReportType } from "./report.config.js";

export const observationReportQuerySchema = z.object({
  surveyPeriodId: z.string().trim().optional(),
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
  storeId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  forceRefresh: z.coerce.boolean().optional(),
});