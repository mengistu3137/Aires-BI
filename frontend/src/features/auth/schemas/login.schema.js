import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().nonempty('Email is required').email('Invalid email format'),
  password: z
    .string()
    .nonempty('Password is required')
    .min(6, 'Password must be at least 6 characters'),
})
