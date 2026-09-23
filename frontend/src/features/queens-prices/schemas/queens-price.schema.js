import { z } from "zod";

/**
 * Create Queens Price schema
 * Mirrors backend queens-price.validation.js
 */
export const createQueensPriceSchema = z
  .object({
    productId: z.string().trim().min(1, "Product is required"),
    price: z
      .union([z.string(), z.number()])
      .transform((val) => {
        if (val === "" || val === null || val === undefined) return NaN;
        return Number(val);
      })
      .refine((v) => Number.isFinite(v) && v > 0, "Price must be a positive number greater than 0"),
    effectiveFrom: z.string().min(1, "Effective from date is required"),
    effectiveTo: z.string().optional().or(z.literal("")),
    source: z
      .string()
      .trim()
      .max(255, "Source cannot exceed 255 characters")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (!data.effectiveTo) return true;
      return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
    },
    {
      message: "Effective to must be strictly after effective from",
      path: ["effectiveTo"],
    }
  );

/**
 * Update Queens Price schema
 * Product cannot be changed once created
 */
export const updateQueensPriceSchema = z
  .object({
    price: z
      .union([z.string(), z.number()])
      .transform((val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      })
      .optional()
      .refine(
        (v) => v === undefined || (Number.isFinite(v) && v > 0),
        "Price must be a positive number greater than 0"
      ),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().optional().or(z.literal("")),
    source: z
      .string()
      .trim()
      .max(255, "Source cannot exceed 255 characters")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (!data.effectiveFrom || !data.effectiveTo) return true;
      return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
    },
    {
      message: "Effective to must be strictly after effective from",
      path: ["effectiveTo"],
    }
  );
