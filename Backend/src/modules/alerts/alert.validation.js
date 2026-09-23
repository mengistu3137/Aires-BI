import { z } from "zod";

export const alertIdParamSchema = z.object({
  id: z.string().uuid("Invalid alert ID format"),
});

export const resolveAlertSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .max(1000, "Resolution note cannot exceed 1000 characters")
    .optional(),
});

export const generateAlertsForSurveyPeriodSchema = z.object({
  surveyPeriodId: z
    .string({ required_error: "surveyPeriodId is required" })
    .trim()
    .min(1, "surveyPeriodId cannot be empty"),
});

export const generateAlertForAnalysisSchema = z.object({
  priceAnalysisId: z.string().uuid("Invalid Price Analysis ID format"),
});

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().trim().optional(),
  surveyPeriodId: z.string().trim().optional(),
  type: z.enum(["PRICE_DOWN", "PRICE_UP", "KEEP", "REVIEW"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  resolved: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
