import { z } from "zod";

/**
 * Query for all report endpoints:
 *   GET /reports/observations/(summary|pdf|excel)?surveyPeriodId=...&storeId=...
 *
 * - surveyPeriodId is required.
 * - storeId is optional. An empty value (?storeId=) is treated as "not provided".
 */
export const observationReportQuerySchema = z.object({
  surveyPeriodId: z
    .string({ required_error: "surveyPeriodId is required" })
    .trim()
    .min(1, "surveyPeriodId is required"),
  storeId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});
