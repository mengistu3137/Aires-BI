import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Identifier is required" })
    .min(3, "Identifier must be at least 3 characters (phone or email)"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});