import { z } from "zod";

// GPS coordinate validation
const latitudeSchema = z
  .number({ required_error: "Latitude is required" })
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90")
  .refine((v) => Number.isFinite(v), "Invalid latitude");

const longitudeSchema = z
  .number({ required_error: "Longitude is required" })
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180")
  .refine((v) => Number.isFinite(v), "Invalid longitude");

const accuracySchema = z
  .number({ required_error: "GPS accuracy is required" })
  .min(0, "Accuracy cannot be negative")
  .refine((v) => Number.isFinite(v), "Invalid accuracy");

export const createAuditSchema = z.object({
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().or(z.literal("")),
});

export const startAuditSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  accuracyMeters: accuracySchema,
});

export const updateAuditSchema = z.object({
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").nullable().optional(),
});

export const completeAuditSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  accuracyMeters: accuracySchema,
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional().or(z.literal("")),
});

export const cancelAuditSchema = z.object({
  reason: z
    .string({ required_error: "Cancellation reason is required" })
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export const markReviewSchema = z.object({
  reviewNote: z
    .string({ required_error: "Review note is required" })
    .trim()
    .min(3, "Review note must be at least 3 characters")
    .max(1000, "Review note cannot exceed 1000 characters"),
});

export const listAuditsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NEEDS_REVIEW"])
    .optional(),
  assignmentId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  surveyPeriodId: z.string().optional(),
  auditorId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
