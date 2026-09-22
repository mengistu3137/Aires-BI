import { z } from "zod";

export const ROLES = ["ADMIN", "MANAGER", "FIELD_AUDITOR"];

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(9, "Valid phone number is required"),
  email: z.string().email("Valid email address is required").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(ROLES).default("FIELD_AUDITOR"),
  active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(9).optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export const userQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.string().optional(),
  search: z.string().optional(),
});