import { z } from "zod";

export const ASSIGNMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export const createAssignmentSchema = z.object({
    auditorId: z.string().uuid("Valid auditor user ID is required"),
    storeId: z.string({ required_error: "Store ID is required" }),
    surveyPeriodId: z.string({ required_error: "Survey Period ID is required" }),
    productIds: z.array(z.string()).min(1, "At least one product must be assigned for audit"),
    status: z.enum(ASSIGNMENT_STATUSES).default("NOT_STARTED"),
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
});