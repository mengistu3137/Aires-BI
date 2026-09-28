import { z } from "zod";

export const ROLES = ["ADMIN", "MANAGER", "FIELD_AUDITOR"];

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),

    // Phone: optional / can be empty string, but if provided, must be at least 9 digits
    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || val === "+251" || val.replace(/\D/g, "").length >= 9,
        "Phone number must be at least 9 digits"
      ),

    // Email: optional / can be empty string, but if provided, must be a valid email format
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
      // Check if a valid phone is entered (excluding just the +251 prefix)
      const hasPhone = Boolean(
        data.phone &&
        data.phone.trim() !== "" &&
        data.phone !== "+251" &&
        data.phone.replace(/\D/g, "").length >= 9
      );

      // Check if email is entered
      const hasEmail = Boolean(data.email && data.email.trim() !== "");

      // Validation passes if AT LEAST ONE is provided
      return hasPhone || hasEmail;
    },
    {
      message: "Please provide either a phone number or an email address",
      path: ["phone"], // Highlights the phone field if neither is provided
    }
  );

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(9).optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(ROLES).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export const userQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.string().optional(),
  search: z.string().optional(),
});