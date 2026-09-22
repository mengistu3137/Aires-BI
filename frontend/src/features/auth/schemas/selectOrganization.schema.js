import { z } from 'zod'

export const selectOrganizationSchema = z.object({
  organizationId: z.string().nonempty('Please select an organization to proceed'),
})
