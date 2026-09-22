import { apiClient } from '@/services/client.js'

export const fetchAuthenticatedImageUrl = async (relativePath) => {
  const match = relativePath?.match(/\/uploads\/payment-proofs\/(.+)$/)
  if (!match) return relativePath // already absolute / not a proof image

  const response = await apiClient.get(`/payment-proof/image/${match[1]}`, {
    responseType: 'blob',
  })
  return URL.createObjectURL(response.data)
}
