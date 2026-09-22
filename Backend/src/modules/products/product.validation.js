import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "Fresh",
  "Ultra-Sensitive",
  "Sensitive",
  "Non-Sensitive",
  "Dry",
];

export const createProductSchema = z.object({
  id: z
    .string({ required_error: "Item ID is required (e.g. VEG-01)" })
    .min(2, "Item ID must be at least 2 characters")
    .toUpperCase(),
  name: z.string({ required_error: "Product name is required" }).min(2),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string({ required_error: "Category is required" }),
  unit: z.string().default("kg"),
  active: z.boolean().default(true),
  // Initial Queens Benchmark Price
  initialQueensPrice: z
    .number({ required_error: "Initial Queens benchmark price is required" })
    .positive("Price must be greater than 0"),
  priceEffectiveFrom: z.string().datetime().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  active: z.boolean().optional(),
});

export const addQueensPriceSchema = z.object({
  price: z.number().positive("Price must be greater than zero"),
  effectiveFrom: z.string().datetime().default(() => new Date().toISOString()),
  effectiveTo: z.string().datetime().optional(),
  source: z.string().default("Manual ERP Update"),
  notes: z.string().optional(),
});

export const productQuerySchema = z.object({
  category: z.string().optional(),
  active: z.string().optional(),
  search: z.string().optional(),
});