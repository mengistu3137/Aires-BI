import { z } from "zod";

export const PRICE_ACTIONS = ["PRICE_DOWN", "PRICE_UP", "KEEP", "REVIEW"];

/**
 * Query schema mirroring backend listPriceAnalysesQuerySchema
 * Used internally for validation before sending to API.
 */
export const listPriceAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  surveyPeriodId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  action: z.enum(PRICE_ACTIONS).optional(),
  category: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const calculateAnalysisSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  surveyPeriodId: z.string().trim().min(1, "Survey period is required"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const recalculateSurveyPeriodSchema = z.object({
  surveyPeriodId: z.string().trim().min(1, "Survey period is required"),
});
