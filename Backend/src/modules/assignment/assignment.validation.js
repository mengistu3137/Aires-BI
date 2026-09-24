import { z } from "zod";

export const ASSIGNMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export const createAssignmentSchema = z.object({
    // Accept any valid user ID string (supports both 'USR-003' and standard UUIDs)
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
        required_error: "Valid status is required (NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED)",
    }),
});

export const assignmentQuerySchema = z.object({
    auditorId: z.string().optional(),
    storeId: z.string().optional(),
    surveyPeriodId: z.string().optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
}).optional();