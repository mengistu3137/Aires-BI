import { z } from "zod";

export const STORE_TYPES = ["FMCG", "FRESH", "BOTH"];

export const createStoreSchema = z.object({
    id: z.string().optional(),
    competitorId: z.string({ required_error: "Competitor ID is required" }),
    name: z.string({ required_error: "Store name is required" }).min(2),
    address: z.string().optional(),
    city: z.string().default("Addis Ababa"),
    area: z.string().optional(),
    type: z.enum(STORE_TYPES).default("FMCG"),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    active: z.boolean().default(true),
});

export const updateStoreSchema = z.object({
    name: z.string().min(2).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    type: z.enum(STORE_TYPES).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    active: z.boolean().optional(),
});