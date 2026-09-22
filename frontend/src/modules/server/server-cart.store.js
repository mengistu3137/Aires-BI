import { create } from 'zustand'

function clampQuantity(quantity) {
  const value = Number(quantity)
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

export const useServerCartStore = create((set, get) => ({
  items: [],

  addItem: (product) => {
    if (!product?.id) return

    const { items } = get()
    const index = items.findIndex((item) => item.productId === product.id)

    if (index >= 0) {
      const nextItems = items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity: item.quantity + 1 } : item,
      )
      set({ items: nextItems })
      return
    }

    set({
      items: items.concat({
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
      }),
    })
  },

  removeItem: (productId) => {
    const { items } = get()
    set({ items: items.filter((item) => item.productId !== productId) })
  },

  setQuantity: (productId, quantity) => {
    const safeQuantity = clampQuantity(quantity)
    const { items } = get()
    set({
      items: items.map((item) =>
        item.productId === productId ? { ...item, quantity: safeQuantity } : item,
      ),
    })
  },

  clearCart: () => set({ items: [] }),
}))
