import { z } from "zod";

const coordinateLatitude = z
  .number({ required_error: "Latitude is required and must be a number" })
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90")
  .refine((v) => !Number.isNaN(v) && Number.isFinite(v), "Invalid latitude");

const coordinateLongitude = z
  .number({ required_error: "Longitude is required and must be a number" })
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180")
  .refine((v) => !Number.isNaN(v) && Number.isFinite(v), "Invalid longitude");

const accuracyMeters = z
  .number({
    required_error: "Accuracy in meters is required and must be a number",
  })
  .min(0, "Accuracy cannot be negative")
  .refine((v) => !Number.isNaN(v) && Number.isFinite(v), "Invalid accuracy");

export const assignmentIdParamSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID format"),
});

export const auditIdParamSchema = z.object({
  auditId: z.string().uuid("Invalid audit ID format"),
});

export const createAuditSchema = z.object({
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

export const startAuditSchema = z.object({
  latitude: coordinateLatitude,
  longitude: coordinateLongitude,
  accuracyMeters: accuracyMeters,
});

export const updateAuditSchema = z
  .object({
    notes: z
      .string()
      .max(2000, "Notes cannot exceed 2000 characters")
      .nullable()
      .optional(),
  })
  .strict("Only notes can be updated through this endpoint");

export const completeAuditSchema = z.object({
  latitude: coordinateLatitude,
  longitude: coordinateLongitude,
  accuracyMeters: accuracyMeters,
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
});

export const cancelAuditSchema = z.object({
  reason: z
    .string({ required_error: "Cancellation reason is required" })
    .trim()
    .min(3, "Cancellation reason must be at least 3 characters")
    .max(500, "Cancellation reason cannot exceed 500 characters"),
});

export const markReviewAuditSchema = z.object({
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
    .enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "NEEDS_REVIEW",
    ])
    .optional(),
  assignmentId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  surveyPeriodId: z.string().optional(),
  auditorId: z.string().uuid().optional(),
  from: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  to: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
});
