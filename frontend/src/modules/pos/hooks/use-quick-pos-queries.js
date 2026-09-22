import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersService } from '../../../services/orders.service'
import { productsService } from '../../../services/products.service'
import { reportsService } from '../../../services/reports.service'

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date()
  end.setHours(23, 59, 59, 999)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

export function quickPosSummaryQueryKey() {
  const range = getTodayRange()
  return ['quick-pos-summary', range.startDate, range.endDate]
}

export function quickPosCatalogQueryKey() {
  return ['quick-pos-catalog']
}

export function useQuickPosCatalog() {
  return useQuery({
    queryKey: quickPosCatalogQueryKey(),
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        productsService.list({ isActive: true, limit: 200 }),
        productsService.listCategories({ isActive: true, limit: 200 }),
      ])

      return {
        products: Array.isArray(products?.data)
          ? products.data
          : Array.isArray(products)
            ? products
            : [],
        categories: Array.isArray(categories?.data)
          ? categories.data
          : Array.isArray(categories)
            ? categories
            : [],
      }
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  })
}

export function useQuickPosSummary() {
  const range = useMemo(() => getTodayRange(), [])

  return useQuery({
    queryKey: ['quick-pos-summary', range.startDate, range.endDate],
    queryFn: () => reportsService.dashboard(range),
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  })
}

export function useQuickPosCheckout() {
  const queryClient = useQueryClient()
  const range = useMemo(() => getTodayRange(), [])

  return useMutation({
    mutationFn: (payload) => ordersService.quickCreate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['quick-pos-summary', range.startDate, range.endDate],
      })
      queryClient.invalidateQueries({ queryKey: quickPosCatalogQueryKey() })
    },
  })
}
