import { z } from 'zod'

export const registerSchema = z
  .object({
    orgName: z
      .string()
      .trim()
      .nonempty('Organization name is required')
      .min(2, 'Organization name must be at least 2 characters'),
    businessType: z.enum(['RESTAURANT', 'BAKERY', 'PHARMACY', 'SHOP']).default('RESTAURANT'),
    name: z.string().trim().nonempty('Admin name is required'),
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format')
      .optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
    countryId: z.string().optional(),
    regionId: z.string().optional(),
    cityId: z.string().optional(),
    address: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
