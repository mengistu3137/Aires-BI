import { ApiError } from '../services/apiError.js'

export const extractErrorMessage = (error) => {
  if (error instanceof ApiError) return error.message
  return error?.message || 'An unknown client failure has occurred.'
}
