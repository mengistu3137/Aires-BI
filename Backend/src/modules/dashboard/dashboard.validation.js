import { z } from "zod";

export const getDashboardQuerySchema = z.object({
  surveyPeriodId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
