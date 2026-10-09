import { z } from "zod";

export const ASSIGNMENT_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const createAssignmentSchema = z.object({
  auditorId: z
    .string({ required_error: "Auditor ID is required" })
    .min(1, "Auditor ID is required"),
  storeId: z
    .string({ required_error: "Store ID is required" })
    .min(1, "Store ID is required"),
  surveyPeriodId: z
    .string({ required_error: "Survey Period ID is required" })
    .min(1, "Survey Period ID is required"),
  productIds: z
    .array(z.string())
    .min(1, "At least one product must be assigned for audit"),
  status: z.enum(ASSIGNMENT_STATUSES).optional().default("NOT_STARTED"),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES, {
    required_error:
      "Valid status is required (NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED)",
  }),
});

export const updateAssignmentSchema = z
  .object({
    auditorId: z.string().min(1, "Auditor ID cannot be empty").optional(),
    storeId: z.string().min(1, "Store ID cannot be empty").optional(),
    surveyPeriodId: z
      .string()
      .min(1, "Survey period ID cannot be empty")
      .optional(),
    productIds: z
      .array(z.string())
      .min(1, "At least one product is required")
      .optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
  })
  .refine(
    (data) =>
      data.auditorId !== undefined ||
      data.storeId !== undefined ||
      data.surveyPeriodId !== undefined ||
      data.productIds !== undefined ||
      data.status !== undefined,
    { message: "At least one field must be provided" },
  );

export const assignmentQuerySchema = z
  .object({
    auditorId: z.string().optional(),
    storeId: z.string().optional(),
    surveyPeriodId: z.string().optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  })
  .optional();

// ============================================================
// BATCH MULTI-AUDITOR ASSIGNMENT SCHEMAS
// ============================================================

export const createBatchAssignmentSchema = z.object({
  storeId: z.string({ required_error: "Store ID is required" }).min(1),
  surveyPeriodId: z.string({ required_error: "Survey Period ID is required" }).min(1),
  allocations: z
    .array(
      z.object({
        auditorId: z.string({ required_error: "Auditor ID is required" }).min(1),
        productIds: z
          .array(z.string())
          .min(1, "Each auditor must be allocated at least one product"),
      })
    )
    .min(1, "At least one auditor must be assigned"),
});

export const updateStoreAllocationsSchema = z.object({
  storeId: z.string().min(1),
  surveyPeriodId: z.string().min(1),
  previousStoreId: z.string().min(1).optional(),
  allocations: z
    .array(
      z.object({
        auditorId: z.string().min(1),
        productIds: z
          .array(z.string())
          .min(1, "Each auditor must be allocated at least one product"),
      })
    )
    .min(1, "At least one auditor must remain assigned"),
});