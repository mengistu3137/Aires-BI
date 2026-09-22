import { z } from "zod";

export const COMPETITOR_TYPES = ["FMCG", "Fresh"];

export const createCompetitorSchema = z.object({
    id: z
        .string({ required_error: "Competitor identifier is required (e.g. shoa)" })
        .min(2, "ID must be at least 2 characters")
        .regex(/^[a-z0-9-]+$/, "ID must be lowercase and hyphenated"),
    name: z
        .string({ required_error: "Competitor name is required" })
        .min(2, "Name must be at least 2 characters"),
    market: z
        .string({ required_error: "Market name is required" })
        .min(2, "Market name must be at least 2 characters"),
    type: z.enum(COMPETITOR_TYPES, {
        errorMap: () => ({
            message: `Type must be either ${COMPETITOR_TYPES.join(" or ")}`,
        }),
    }).default("FMCG"),
    active: z.boolean().default(true),
});

export const updateCompetitorSchema = z.object({
    name: z.string().min(2).optional(),
    market: z.string().min(2).optional(),
    type: z.enum(COMPETITOR_TYPES).optional(),
    active: z.boolean().optional(),
});