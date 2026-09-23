import { z } from "zod";

export const auditIdParamSchema = z.object({
  auditId: z.string().uuid("Invalid audit ID format"),
});

export const observationIdParamSchema = z.object({
  observationId: z.string().uuid("Invalid observation ID format"),
});

export const createObservationSchema = z
  .object({
    clientObservationId: z
      .string({
        required_error:
          "clientObservationId is required for offline sync idempotency",
      })
      .trim()
      .min(1, "clientObservationId cannot be empty")
      .max(128, "clientObservationId cannot exceed 128 characters"),
    productId: z
      .string({ required_error: "productId is required" })
      .trim()
      .min(1, "productId is required"),
    availability: z.enum(["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"], {
      required_error:
        "availability is required (AVAILABLE, OUT_OF_STOCK, NOT_FOUND)",
    }),
    price: z
      .number()
      .positive("Price must be greater than zero")
      .refine(
        (v) => !Number.isNaN(v) && Number.isFinite(v),
        "Invalid price number",
      )
      .nullable()
      .optional(),
    observedUnit: z.string().trim().max(30).nullable().optional(),
    packageSize: z.string().trim().max(50).nullable().optional(),
    capturedAt: z
      .string({ required_error: "capturedAt timestamp is required" })
      .datetime({
        offset: true,
        message: "capturedAt must be a valid ISO 8601 datetime",
      })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/)),
    evidencePhotoUrl: z
      .string()
      .url("evidencePhotoUrl must be a valid URL")
      .max(1000)
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters")
      .nullable()
      .optional(),
  })
  .strict();

export const updateObservationSchema = z
  .object({
    availability: z.enum(["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"]).optional(),
    price: z
      .number()
      .positive("Price must be greater than zero")
      .refine(
        (v) => !Number.isNaN(v) && Number.isFinite(v),
        "Invalid price number",
      )
      .nullable()
      .optional(),
    observedUnit: z.string().trim().max(30).nullable().optional(),
    packageSize: z.string().trim().max(50).nullable().optional(),
    evidencePhotoUrl: z
      .string()
      .url("evidencePhotoUrl must be a valid URL")
      .max(1000)
      .nullable()
      .optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict(
    "Modifying protected system fields (auditId, productId, auditorId, syncStatus) is forbidden",
  );

export const rejectObservationSchema = z.object({
  reviewNote: z
    .string({
      required_error: "A rejection note explaining the reason is required",
    })
    .trim()
    .min(3, "Rejection note must be at least 3 characters")
    .max(1000, "Rejection note cannot exceed 1000 characters"),
});

export const requestReviewObservationSchema = z.object({
  reviewNote: z
    .string({
      required_error: "Review note explaining the request is required",
    })
    .trim()
    .min(3, "Review note must be at least 3 characters")
    .max(1000, "Review note cannot exceed 1000 characters"),
});

export const listObservationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().trim().optional(),
  availability: z.enum(["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"]).optional(),
  reviewStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_REVIEW"])
    .optional(),
  syncStatus: z.enum(["PENDING", "SYNCING", "SYNCED", "FAILED"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
