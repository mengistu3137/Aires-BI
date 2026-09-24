import { z } from "zod";

export const STORE_TYPES = ["FMCG", "FRESH", "BOTH"];

export const createStoreSchema = z.object({
    id: z.string().optional(),
    competitorId: z.string({ required_error: "Competitor ID is required" }).min(1),
    name: z.string({ required_error: "Store name is required" }).min(2),
    address: z.string().nullable().optional(),
    city: z.string().default("Addis Ababa"),
    area: z.string().nullable().optional(),
    type: z.enum(STORE_TYPES).default("FMCG"),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    active: z.boolean().default(true),
});

export const updateStoreSchema = z.object({
    competitorId: z.string().min(1).optional(),
    name: z.string().min(2).optional(),
    address: z.string().nullable().optional(),
    city: z.string().optional(),
    area: z.string().nullable().optional(),
    type: z.enum(STORE_TYPES).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    active: z.boolean().optional(),
});