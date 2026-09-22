import { z } from "zod";

export const biQuerySchema = z.object({
    periodId: z.string().optional(),
    targetIndex: z.coerce.number().positive().default(0.95),
    category: z.string().optional(),
});