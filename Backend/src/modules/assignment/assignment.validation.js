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

/**
 * Status-only update — used by FIELD_AUDITOR to advance their own assignment.
 */
export const updateAssignmentStatusSchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES, {
    required_error:
      "Valid status is required (NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED)",
  }),
});

/**
 * Full update — ADMIN / MANAGER can change auditor, store, period, products.
 * All fields optional; at least one must be present.
 * `status` is still allowed here so the manager can advance from NOT_STARTED.
 */
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
  })
  .optional();
