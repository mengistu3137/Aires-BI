import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "Fresh",
  "Ultra-Sensitive",
  "Sensitive",
  "Non-Sensitive",
  "Dry",
];

export const SURVEY_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "BI_YEARLY"];

export const createProductSchema = z.object({
  id: z
    .string({ required_error: "Item ID / Barcode is required (e.g. 8901030364402 or VEG-01)" })
    .trim()
    .min(1, "Item ID must be at least 1 character"),
  name: z.string({ required_error: "Product name is required" }).trim().min(2),
  description: z.string().trim().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  category: z.string({ required_error: "Category is required" }).trim().min(1),
  frequency: z.enum(SURVEY_FREQUENCIES).default("WEEKLY"),
  unit: z.string().trim().default("pcs"),               // was "kg"; the Item Master has no unit column
  priceSource: z.string().trim().max(200).optional(), 
  active: z.boolean().default(true),
  initialQueensPrice: z
    .number({ required_error: "Initial Queens benchmark price is required" })
    .positive("Price must be greater than 0"),
  priceEffectiveFrom: z.string().datetime().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  category: z.string().optional(),
  frequency: z.enum(SURVEY_FREQUENCIES).optional(),
  unit: z.string().optional(),
  active: z.boolean().optional(),
});

export const addQueensPriceSchema = z.object({
  price: z.number().positive("Price must be greater than zero"),
  effectiveFrom: z.string().datetime().default(() => new Date().toISOString()),
  effectiveTo: z.string().datetime().optional().nullable(),
  source: z.string().default("Manual ERP Update"),
  notes: z.string().optional().nullable(),
});

export const productQuerySchema = z.object({
  category: z.string().optional(),
  active: z.string().optional(),
  search: z.string().optional(),
});

const bulkItemSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  category: z.string().trim().default("General"),
  unit: z.string().trim().default("kg"),
  frequency: z.enum(SURVEY_FREQUENCIES).default("WEEKLY"),
  initialQueensPrice: z.number().nonnegative().default(0),
});

export const bulkProductImportSchema = z.union([
  z.array(bulkItemSchema).min(1, "At least one product item is required for import"),
  z.object({
    items: z.array(bulkItemSchema).min(1, "At least one product item is required for import"),
  }),
]);