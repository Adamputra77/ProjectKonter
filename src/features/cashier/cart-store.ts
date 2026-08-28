"use client"

import { create } from "zustand"
import type { CartItem, Product, PaymentMethod } from "@/types"
import { calcSubtotal } from "@/lib/utils/money"

interface CartState {
  items: CartItem[]
  discount: number
  paymentMethod: PaymentMethod | null
  // Kartu produk dari database (untuk pengecekan stok cepat & refresh)
  productsById: Map<string, Product>

  setProducts: (products: Product[]) => void
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  changeQuantity: (productId: string, delta: number) => void
  setQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setDiscount: (discount: number) => void
  setPaymentMethod: (method: PaymentMethod) => void
  syncStock: (productId: string, newStock: number) => void
}

function freshFromProduct(p: Product, quantity: number): CartItem {
  return {
    product_id: p.id,
    kode_produk: p.kode_produk,
    nama_produk: p.nama_produk,
    harga_jual: Number(p.harga_jual),
    stok: p.stok,
    satuan: p.satuan,
    quantity,
    subtotal: quantity * Number(p.harga_jual),
  }
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  discount: 0,
  paymentMethod: null,
  productsById: new Map(),

  setProducts: (products) =>
    set((state) => {
      const map = new Map<string, Product>()
      for (const p of products) map.set(p.id, p)
      // Perbarui harga & stok item yang sudah ada di keranjang
      const items = state.items.map((item) => {
        const fresh = map.get(item.product_id)
        if (!fresh) return item
        return {
          ...item,
          nama_produk: fresh.nama_produk,
          harga_jual: Number(fresh.harga_jual),
          stok: fresh.stok,
          subtotal: item.quantity * Number(fresh.harga_jual),
        }
      })
      return { productsById: map, items }
    }),

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stok) return state
        const quantity = existing.quantity + 1
        return {
          items: state.items.map((i) =>
            i.product_id === product.id ? { ...i, quantity, subtotal: quantity * i.harga_jual } : i
          ),
        }
      }
      if (product.stok <= 0) return state
      return { items: [...state.items, freshFromProduct(product, 1)] }
    }),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) })),

  changeQuantity: (productId, delta) =>
    set((state) => ({
      items: state.items
        .map((i) => {
          if (i.product_id !== productId) return i
          const product = state.productsById.get(productId)
          const max = product ? product.stok : i.stok
          const quantity = Math.min(Math.max(i.quantity + delta, 1), max)
          return { ...i, quantity, subtotal: quantity * i.harga_jual }
        })
        .filter((i) => i.quantity > 0),
    })),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product_id !== productId) return i
        const product = state.productsById.get(productId)
        const max = product ? product.stok : i.stok
        const q = Math.min(Math.max(quantity, 0), max)
        return { ...i, quantity: q, subtotal: q * i.harga_jual }
      }),
    })),

  clearCart: () => set({ items: [], discount: 0, paymentMethod: null }),

  setDiscount: (discount) => set({ discount: Math.max(discount, 0) }),

  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  syncStock: (productId, newStock) =>
    set((state) => {
      const map = new Map(state.productsById)
      const p = map.get(productId)
      if (p) {
        map.set(productId, { ...p, stok: newStock })
        // Sesuaikan qty bila melebihi stok baru
        const items = state.items.map((i) =>
          i.product_id === productId
            ? { ...i, stok: newStock, quantity: Math.min(i.quantity, newStock), subtotal: Math.min(i.quantity, newStock) * i.harga_jual }
            : i
        )
        return { productsById: map, items }
      }
      return { productsById: map }
    }),
}))

// Selektor memoized untuk total — dipakai komponen agar tidak re-render berlebihan
export function useCartTotals() {
  return useCartStore((state) => ({
    itemCount: state.items.reduce((n, i) => n + i.quantity, 0),
    subtotal: calcSubtotal(state.items),
    discount: state.discount,
    items: state.items,
  }))
}