import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "Ultra-Sensitive",
  "Sensitive",
  "Non-Sensitive",
  "Dry",
  "Fresh",
];

export const createProductSchema = z.object({
  id: z
    .string({ required_error: "Item ID is required (e.g., Veg-01)" })
    .min(2, "Item ID must be at least 2 characters"),
  name: z
    .string({ required_error: "Product name is required" })
    .min(2, "Product name must be at least 2 characters"),
  category: z.enum(PRODUCT_CATEGORIES, {
    errorMap: () => ({
      message: `Category must be one of: ${PRODUCT_CATEGORIES.join(", ")}`,
    }),
  }),
  unit: z.string().default("kg"),
  queensPrice: z
    .number({ required_error: "Queens benchmark price is required" })
    .positive("Queens price must be greater than zero"),
  active: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  unit: z.string().optional(),
  queensPrice: z.number().positive().optional(),
  active: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  category: z.string().optional(),
  active: z.string().optional(),
  search: z.string().optional(),
});