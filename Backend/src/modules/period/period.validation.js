import { z } from "zod";

export const PERIOD_STATUSES = ["DRAFT", "OPEN", "CLOSED"];

export const createPeriodSchema = z.object({
    id: z
        .string({ required_error: "Period ID is required (e.g. 2026-W39)" })
        .regex(/^\d{4}-W\d{2}$/, "Format must be YYYY-Www (e.g. 2026-W39)"),
    name: z.string({ required_error: "Period name is required" }).min(3),
    startDate: z.string().datetime({ message: "Valid ISO startDate required" }),
    endDate: z.string().datetime({ message: "Valid ISO endDate required" }),
    status: z.enum(PERIOD_STATUSES).default("DRAFT"),
});

export const updatePeriodStatusSchema = z.object({
    status: z.enum(PERIOD_STATUSES),
});