import { z } from "zod";

const coordinateLatitude = z
  .number()
  .min(-90)
  .max(90)
  .nullable()
  .optional();

const coordinateLongitude = z
  .number()
  .min(-180)
  .max(180)
  .nullable()
  .optional();

const accuracyMeters = z
  .number()
  .min(0)
  .nullable()
  .optional();

export const startAuditSchema = z.object({
  latitude: coordinateLatitude,
  longitude: coordinateLongitude,
  accuracyMeters: accuracyMeters,
  gpsBypassed: z.boolean().optional().default(false),
});

export const completeAuditSchema = z.object({
  latitude: coordinateLatitude,
  longitude: coordinateLongitude,
  accuracyMeters: accuracyMeters,
  gpsBypassed: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional(),
});




export const assignmentIdParamSchema = z.object({
  assignmentId: z
    .string({ required_error: "assignmentId is required" })
    .trim()
    .min(1, "assignmentId cannot be empty"),
});

export const auditIdParamSchema = z.object({
  auditId: z
    .string({ required_error: "auditId is required" })
    .trim()
    .min(1, "auditId cannot be empty"),
});

export const createAuditSchema = z.object({
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
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
  assignmentId: z.string().trim().optional(),
  storeId: z.string().trim().optional(),
  surveyPeriodId: z.string().trim().optional(),
  auditorId: z.string().trim().optional(),
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
