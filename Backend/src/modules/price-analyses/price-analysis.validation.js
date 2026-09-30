import { z } from "zod";

export const priceAnalysisIdParamSchema = z.object({
  id: z.string().uuid("Invalid Price Analysis ID format"),
});

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
});

export const surveyPeriodIdParamSchema = z.object({
  surveyPeriodId: z.string().trim().min(1, "surveyPeriodId is required"),
});

export const createOrUpdateAnalysisSchema = z.object({
  productId: z
    .string({ required_error: "productId is required" })
    .trim()
    .min(1, "productId cannot be empty"),
  surveyPeriodId: z
    .string({ required_error: "surveyPeriodId is required" })
    .trim()
    .min(1, "surveyPeriodId cannot be empty"),
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "asOfDate must be in YYYY-MM-DD format")
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const recalculateSurveyPeriodSchema = z.object({
  surveyPeriodId: z
    .string({ required_error: "surveyPeriodId is required" })
    .trim()
    .min(1, "surveyPeriodId cannot be empty"),
  categoryStream: z.enum(["ALL", "FRESH", "FMCG"]).default("ALL").optional(),
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "asOfDate must be in YYYY-MM-DD format")
    .optional(),
});

export const listPriceAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  surveyPeriodId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  action: z.enum(["PRICE_DOWN", "PRICE_UP", "KEEP", "REVIEW"]).optional(),
  category: z.string().trim().optional(),
  asOfDate: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});