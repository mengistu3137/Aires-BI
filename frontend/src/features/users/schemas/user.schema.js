import { z } from 'zod'

/**
 * Client-side validation schema for creating a new user.
 * Aligned to support dynamically created custom role codes.
 */
export const createUserSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .trim(),
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters'),
    role: z
        .string()
        .min(1, 'Please select a valid system or custom role'), // ✅ Aligned: Changed from enum to support custom roles
    branchId: z
        .string()
        .min(1, 'Please select a branch assignment'),
})

/**
 * Client-side validation schema for updating an existing user's details.
 * Aligned to support dynamically created custom role codes.
 */
export const updateUserSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .trim()
        .optional(),
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim()
        .optional(),
    role: z
        .string()
        .min(1, 'Please select a valid system or custom role')
        .optional(), // ✅ Aligned: Changed from enum to support custom roles
    branchId: z
        .string()
        .min(1, 'Please select a branch assignment')
        .optional(),
    version: z
        .number()
        .optional(), // Enforces optimistic concurrency checks on updates
})

/**
 * Client-side validation schema for resetting passwords.
 * Resolves password-matching validation and sets error paths cleanly.
 */
export const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(6, 'Password must be at least 6 characters'),
        confirmPassword: z
            .string()
            .min(6, 'Please confirm the password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'], // Highlights the mismatch directly on the confirm input field
    })