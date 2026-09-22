import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

function normalizeQuantity(quantity) {
  const value = Number(quantity)
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

function mapProductToCartItem(product) {
  return {
    productId: product.id,
    name: product.name,
    price: Number(product.price) || 0,
    quantity: 1,
    categoryId: product.categoryId || product.category?.id || null,
    categoryName: product.category?.name || 'Uncategorized',
  }
}

function replaceQueueItem(queue, item) {
  const index = queue.findIndex((entry) => entry.id === item.id)
  if (index === -1) return queue.concat(item)
  return queue.map((entry) => (entry.id === item.id ? item : entry))
}

export const useQuickPosStore = create(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      cart: [],
      selectedCategoryId: 'ALL',
      searchQuery: '',
      queuedOrders: [],
      isOffline: false,
      isSyncing: false,
      barcodeInput: '',
      soundEnabled: true,
      lastActionAt: 0,

      setCatalog: ({ products = [], categories = [] }) => set({ products, categories }),
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setBarcodeInput: (barcodeInput) => set({ barcodeInput }),
      toggleSoundEnabled: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setOfflineMode: (isOffline) => set({ isOffline }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      setLastActionAt: (lastActionAt) => set({ lastActionAt }),
      hydrateQueue: (queuedOrders) => set({ queuedOrders }),
      enqueueOrder: (queuedOrder) =>
        set((state) => ({ queuedOrders: replaceQueueItem(state.queuedOrders, queuedOrder) })),
      updateQueuedOrder: (orderId, patch) =>
        set((state) => ({
          queuedOrders: state.queuedOrders.map((entry) =>
            entry.id === orderId ? { ...entry, ...patch } : entry,
          ),
        })),
      removeQueuedOrder: (orderId) =>
        set((state) => ({
          queuedOrders: state.queuedOrders.filter((entry) => entry.id !== orderId),
        })),
      addToCart: (product) => {
        if (!product?.id) return

        const cartItem = mapProductToCartItem(product)
        const cart = get().cart
        const existingIndex = cart.findIndex((item) => item.productId === product.id)

        if (existingIndex >= 0) {
          set({
            cart: cart.map((item, index) =>
              index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
            ),
            lastActionAt: Date.now(),
          })
          return
        }

        set({ cart: cart.concat(cartItem), lastActionAt: Date.now() })
      },
      incrementItem: (productId) => {
        const cart = get().cart
        set({
          cart: cart.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
          ),
          lastActionAt: Date.now(),
        })
      },
      decrementItem: (productId) => {
        const cart = get().cart
        const target = cart.find((item) => item.productId === productId)
        if (!target) return

        if (target.quantity <= 1) {
          set({
            cart: cart.filter((item) => item.productId !== productId),
            lastActionAt: Date.now(),
          })
          return
        }

        set({
          cart: cart.map((item) =>
            item.productId === productId
              ? { ...item, quantity: normalizeQuantity(item.quantity - 1) }
              : item,
          ),
          lastActionAt: Date.now(),
        })
      },
      setItemQuantity: (productId, quantity) => {
        const safeQuantity = normalizeQuantity(quantity)
        set({
          cart: get().cart.map((item) =>
            item.productId === productId ? { ...item, quantity: safeQuantity } : item,
          ),
          lastActionAt: Date.now(),
        })
      },
      removeItem: (productId) =>
        set({
          cart: get().cart.filter((item) => item.productId !== productId),
          lastActionAt: Date.now(),
        }),
      clearCart: () => set({ cart: [], lastActionAt: Date.now() }),
      restoreCart: (cart) => set({ cart, lastActionAt: Date.now() }),
      resetQuickState: () =>
        set({
          cart: [],
          selectedCategoryId: 'ALL',
          searchQuery: '',
          barcodeInput: '',
          lastActionAt: Date.now(),
        }),
    }),
    {
      name: 'milki-quick-pos',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        selectedCategoryId: state.selectedCategoryId,
        searchQuery: state.searchQuery,
        barcodeInput: state.barcodeInput,
        soundEnabled: state.soundEnabled,
      }),
    },
  ),
)
