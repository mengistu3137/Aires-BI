import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ProductCard } from './product-card'

const ROW_HEIGHT = 132
const OVERSCAN_ROWS = 2

function useContainerMetrics(ref) {
  const [metrics, setMetrics] = useState({ width: 0, height: 0, scrollTop: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined

    const updateMetrics = () => {
      setMetrics({
        width: element.clientWidth,
        height: element.clientHeight,
        scrollTop: element.scrollTop,
      })
    }

    updateMetrics()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateMetrics) : null
    resizeObserver?.observe(element)
    element.addEventListener('scroll', updateMetrics, { passive: true })

    return () => {
      resizeObserver?.disconnect()
      element.removeEventListener('scroll', updateMetrics)
    }
  }, [ref])

  return [metrics, setMetrics]
}

function getColumnCount(width) {
  if (width >= 1440) return 4
  if (width >= 1200) return 3
  if (width >= 768) return 2
  return 1
}

function filterProducts(products, searchQuery, selectedCategoryId) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return products.filter((product) => {
    const matchesCategory =
      selectedCategoryId === 'ALL' || product.categoryId === selectedCategoryId
    const matchesSearch =
      !normalizedQuery ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category?.name?.toLowerCase().includes(normalizedQuery)

    return matchesCategory && matchesSearch
  })
}

export const ProductGrid = memo(function ProductGrid({
  products = [],
  cart = [],
  searchQuery = '',
  selectedCategoryId = 'ALL',
  onSelectProduct,
}) {
  const scrollRef = useRef(null)
  const [metrics] = useContainerMetrics(scrollRef)

  const filteredProducts = useMemo(
    () => filterProducts(products, searchQuery, selectedCategoryId),
    [products, searchQuery, selectedCategoryId],
  )

  const columns = Math.max(1, getColumnCount(metrics.width || 0))
  const totalRows = Math.ceil(filteredProducts.length / columns)
  const shouldVirtualize = filteredProducts.length > 50

  const startRow = shouldVirtualize
    ? Math.max(0, Math.floor((metrics.scrollTop || 0) / ROW_HEIGHT) - OVERSCAN_ROWS)
    : 0
  const visibleRowCount = shouldVirtualize
    ? Math.ceil(((metrics.height || 0) + ROW_HEIGHT * OVERSCAN_ROWS * 2) / ROW_HEIGHT)
    : totalRows
  const endRow = shouldVirtualize ? Math.min(totalRows, startRow + visibleRowCount) : totalRows

  const visibleProducts = shouldVirtualize
    ? filteredProducts.slice(startRow * columns, endRow * columns)
    : filteredProducts

  const topSpacer = shouldVirtualize ? startRow * ROW_HEIGHT : 0
  const bottomSpacer = shouldVirtualize ? Math.max(0, (totalRows - endRow) * ROW_HEIGHT) : 0

  const cartLookup = useMemo(
    () => new Map(cart.map((item) => [item.productId, item.quantity])),
    [cart],
  )

  return (
    <div
      ref={scrollRef}
      className="min-h-[50vh] overflow-y-auto rounded-[1.75rem] border border-primary-100/70 bg-surface/95 p-3 shadow-soft-xl"
    >
      <div style={{ height: topSpacer }} />

      {filteredProducts.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center rounded-3xl border border-dashed border-primary-100/70 bg-primary-50/40 px-4 py-10 text-center text-sm text-text-secondary">
          No products matched the current category.
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cartLookup.get(product.id) || 0}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}

      <div style={{ height: bottomSpacer }} />
    </div>
  )
})
