import { z } from "zod";

export const ROLES = ["ADMIN", "MANAGER", "FIELD_AUDITOR"];

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || val === "+251" || val.replace(/\D/g, "").length >= 9,
        "Phone number must be at least 9 digits",
      ),
    email: z
      .string()
      .trim()
      .email("Valid email address is required")
      .optional()
      .or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(ROLES).default("FIELD_AUDITOR"),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const hasPhone = Boolean(
        data.phone &&
        data.phone.trim() !== "" &&
        data.phone !== "+251" &&
        data.phone.replace(/\D/g, "").length >= 9,
      );
      const hasEmail = Boolean(data.email && data.email.trim() !== "");
      return hasPhone || hasEmail;
    },
    {
      message: "Please provide either a phone number or an email address",
      path: ["phone"],
    },
  );

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z
    .string()
    .trim()
    .min(9)
    .nullable()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email()
    .nullable()
    .optional()
    .or(z.literal("")),
  role: z.enum(ROLES).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

/**
 * Query filters for GET /users. Includes page/limit so the validate
 * middleware keeps them; both are coerced to numbers because query
 * strings always arrive as strings.
 */
export const userQuerySchema = z
  .object({
    role: z.enum(ROLES).optional(),
    active: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .optional();