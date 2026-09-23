import { z } from "zod";

export const ALERT_TYPES = ["PRICE_DOWN", "PRICE_UP", "KEEP", "REVIEW"];
export const ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * Resolution schema mirroring backend resolveAlertSchema.
 * The backend treats resolutionNote as optional.
 */
export const resolveAlertSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .max(1000, "Resolution note cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
});

/**
 * Query schema mirroring backend listAlertsQuerySchema.
 * Used internally for validation before sending to API.
 */
export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().trim().optional(),
  surveyPeriodId: z.string().trim().optional(),
  type: z.enum(ALERT_TYPES).optional(),
  severity: z.enum(ALERT_SEVERITIES).optional(),
  resolved: z.enum(["true", "false"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * Confirm schema for the modal — requires the user to
 * acknowledge by entering no note (allowed) or a valid note.
 */
export const resolveAlertFormSchema = resolveAlertSchema;
