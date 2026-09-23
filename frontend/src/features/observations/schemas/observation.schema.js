import { z } from "zod";

export const AVAILABILITY_OPTIONS = ["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"];
export const REVIEW_STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "NEEDS_REVIEW"];
export const SYNC_STATUS_OPTIONS = ["PENDING", "SYNCING", "SYNCED", "FAILED"];

/**
 * Client-side observation form schema
 * Mirrors backend observation.validation.js
 */
export const observationFormSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    availability: z.enum(AVAILABILITY_OPTIONS, {
      required_error: "Availability is required",
    }),
    price: z
      .union([z.string(), z.number()])
      .transform((val) => {
        if (val === "" || val === null || val === undefined) return null;
        const num = Number(val);
        return Number.isNaN(num) ? null : num;
      })
      .nullable()
      .optional(),
    observedUnit: z.string().trim().max(30).optional().or(z.literal("")),
    packageSize: z.string().trim().max(50).optional().or(z.literal("")),
    evidencePhotoUrl: z.string().url("Invalid photo URL").optional().or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.availability === "AVAILABLE") {
      if (data.price === null || data.price === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Price is required when product is available",
        });
      } else if (data.price <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Price must be greater than 0",
        });
      }
    } else {
      // OUT_OF_STOCK / NOT_FOUND → price must be null
      if (data.price !== null && data.price !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: `Price must be empty when product is ${data.availability === "OUT_OF_STOCK" ? "out of stock" : "not found"}`,
        });
      }
    }
  });

/**
 * Review action schemas
 */
export const rejectObservationSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(3, "Rejection note must be at least 3 characters")
    .max(1000, "Rejection note cannot exceed 1000 characters"),
});

export const requestReviewSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(3, "Review note must be at least 3 characters")
    .max(1000, "Review note cannot exceed 1000 characters"),
});
