import { apiClient } from '../client.js'

/**
 * Creates a single product under the active organization.
 * Endpoint: POST /products
 * @param {object} productData - { name, price, categoryId, sku, type, defaultStationId, isActive }
 */
export const createProductRequest = async (productData) => {
  const response = await apiClient.post('/products', productData)
  return response.data
}

/**
 * Bulk-creates products in an atomic transaction.
 * Endpoint: POST /products/bulk
 * @param {Array<object>} products - Array of product objects
 */
export const bulkCreateProductsRequest = async (products) => {
  const response = await apiClient.post('/products/bulk', products)
  return response.data
}

/**
 * Retrieves a paginated, filterable catalog of products.
 * Endpoint: GET /products
 * @param {object} params - Optional: { search, categoryId, isActive, page, limit }
 */
export const getProductsRequest = async (params = {}) => {
  const response = await apiClient.get('/products', { params })
  return response.data
}

/**
 * Updates an existing product with optimistic locking support.
 * Endpoint: PATCH /products/:id
 * @param {string} prodId - Target product ID
 * @param {object} productData - Fields to update including 'version'
 */
export const updateProductRequest = async (prodId, productData) => {
  const response = await apiClient.patch(`/products/${prodId}`, productData)
  return response.data
}

/**
 * Soft-deletes a product.
 * Endpoint: DELETE /products/:id
 * @param {string} prodId - Target product ID
 */
export const deleteProductRequest = async (prodId) => {
  const response = await apiClient.delete(`/products/${prodId}`)
  return response.data
}
