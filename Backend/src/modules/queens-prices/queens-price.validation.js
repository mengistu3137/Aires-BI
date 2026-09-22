import { z } from "zod";

const priceValidation = z
  .number({ required_error: "Price is required and must be a number" })
  .positive("Price must be a positive number greater than 0")
  .refine(
    (v) => !Number.isNaN(v) && Number.isFinite(v),
    "Invalid price number",
  );

export const queensPriceIdParamSchema = z.object({
  id: z.string().uuid("Invalid QueensPrice ID format"),
});

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
});

export const createQueensPriceSchema = z
  .object({
    productId: z
      .string({ required_error: "productId is required" })
      .trim()
      .min(1, "productId cannot be empty"),
    price: priceValidation,
    effectiveFrom: z
      .string({ required_error: "effectiveFrom is required" })
      .datetime({
        offset: true,
        message: "effectiveFrom must be a valid ISO 8601 datetime",
      })
      .or(
        z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/),
      ),
    effectiveTo: z
      .string()
      .datetime({
        offset: true,
        message: "effectiveTo must be a valid ISO 8601 datetime",
      })
      .or(
        z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/),
      )
      .nullable()
      .optional(),
    source: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.effectiveTo) return true;
      return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
    },
    {
      message: "effectiveTo must be strictly after effectiveFrom",
      path: ["effectiveTo"],
    },
  );

export const updateQueensPriceSchema = z
  .object({
    price: priceValidation.optional(),
    effectiveFrom: z
      .string()
      .datetime({ offset: true })
      .or(
        z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/),
      )
      .optional(),
    effectiveTo: z
      .string()
      .datetime({ offset: true })
      .or(
        z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/),
      )
      .nullable()
      .optional(),
    source: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict("Modifying unauthorized fields is forbidden")
  .refine(
    (data) => {
      if (data.effectiveFrom && data.effectiveTo) {
        return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
      }
      return true;
    },
    {
      message: "effectiveTo must be strictly after effectiveFrom",
      path: ["effectiveTo"],
    },
  );

export const listQueensPricesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().trim().optional(),
  current: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const atDateQuerySchema = z.object({
  date: z
    .string({ required_error: "Query parameter 'date' is required" })
    .datetime({
      offset: true,
      message: "date must be a valid ISO 8601 datetime",
    })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/)),
});
