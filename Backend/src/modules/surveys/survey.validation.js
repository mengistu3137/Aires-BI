import { z } from "zod";

export const ASSIGNMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
export const SYNC_STATUSES = ["PENDING", "SYNCED", "FAILED"];

export const createPeriodSchema = z.object({
  id: z
    .string({ required_error: "Period ID is required (e.g. 2026-W39)" })
    .regex(
      /^\d{4}-W\d{2}$/,
      "Period ID must follow format YYYY-Www (e.g. 2026-W42)",
    ),
  name: z
    .string({ required_error: "Cycle name / description is required" })
    .min(2, "Description must be at least 2 characters"),
  startDate: z
    .string()
    .datetime({ message: "Valid ISO startDate is required" }),
  endDate: z.string().datetime({ message: "Valid ISO endDate is required" }),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).default("OPEN"),
});

export const createAssignmentSchema = z.object({
  auditorId: z.string().uuid("Valid auditor user ID is required"),
  competitorId: z.string().min(2, "Competitor ID is required"),
  marketName: z.string().min(2, "Market name is required"),
  surveyPeriodId: z.string().min(4, "Survey Period ID is required"),
  items: z
    .array(z.string())
    .min(1, "At least one product item must be assigned"),
  status: z.enum(ASSIGNMENT_STATUSES).default("NOT_STARTED"),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES),
});

export const submitEntrySchema = z.object({
  itemId: z.string({ required_error: "Item ID is required" }),
  competitorId: z.string({ required_error: "Competitor ID is required" }),
  marketName: z.string({ required_error: "Market name is required" }),
  surveyPeriodId: z.string().optional(),
  price: z.number().positive("Price must be greater than 0"),
  unit: z.string().default("kg"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  timestamp: z.string().datetime().optional(),
  syncStatus: z.enum(SYNC_STATUSES).default("SYNCED"),
});

export const batchSyncSchema = z.object({
  entries: z
    .array(submitEntrySchema)
    .min(1, "At least one survey entry required for batch sync"),
});
