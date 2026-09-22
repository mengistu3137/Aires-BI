import { useParams } from 'react-router-dom'
import { ProductsPage } from './products-page'

export function EditProductPage() {
  const { productId } = useParams()

  return <ProductsPage initialModalMode="edit" initialProductId={productId} />
}
