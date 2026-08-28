import { beforeEach, describe, expect, it } from "vitest"
import { useCartStore } from "@/features/cashier/cart-store"
import type { Product } from "@/types"

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    kode_produk: "HP001",
    nama_produk: "iPhone 13",
    kategori_id: null,
    harga_beli: 7000000,
    harga_jual: 8000000,
    stok: 5,
    stok_minimum: 1,
    satuan: "pcs",
    deskripsi: null,
    gambar: null,
    is_active: true,
    created_at: "2026-08-12T00:00:00Z",
    updated_at: "2026-08-12T00:00:00Z",
    ...overrides,
  }
}

describe("cart-store", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], discount: 0, paymentMethod: null, productsById: new Map() })
  })

  it("menambahkan item baru", () => {
    useCartStore.getState().addItem(makeProduct())
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(1)
    expect(items[0].subtotal).toBe(8000000)
  })

  it("menambah quantity item yang sama", () => {
    const p = makeProduct()
    useCartStore.getState().addItem(p)
    useCartStore.getState().addItem(p)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
    expect(items[0].subtotal).toBe(16000000)
  })

  it("tidak menambah melebihi stok", () => {
    const p = makeProduct({ stok: 2 })
    const s = useCartStore.getState()
    s.addItem(p)
    s.addItem(p)
    s.addItem(p)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it("tidak menambahkan produk stok nol", () => {
    useCartStore.getState().addItem(makeProduct({ stok: 0 }))
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it("menghapus item", () => {
    const s = useCartStore.getState()
    s.addItem(makeProduct())
    s.removeItem("p1")
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it("changeQuantity menghormati batas stok dari productsById", () => {
    const s = useCartStore.getState()
    s.setProducts([makeProduct({ id: "p1", stok: 3 })])
    s.addItem(makeProduct({ stok: 3 }))
    s.changeQuantity("p1", 5)
    expect(useCartStore.getState().items[0].quantity).toBe(3)
    // Tidak bisa turun di bawah 1 via tombol −; hapus pakai removeItem
    s.changeQuantity("p1", -10)
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it("setDiscount menolak negatif", () => {
    useCartStore.getState().setDiscount(-5000)
    expect(useCartStore.getState().discount).toBe(0)
  })

  it("syncStock menyesuaikan quantity bila stok berkurang", () => {
    const s = useCartStore.getState()
    s.setProducts([makeProduct({ stok: 5 })])
    s.addItem(makeProduct())
    s.changeQuantity("p1", 2) // qty 3
    s.syncStock("p1", 2) // stok baru 2
    const item = useCartStore.getState().items[0]
    expect(item.quantity).toBe(2)
    expect(item.stok).toBe(2)
  })

  it("clearCart mengosongkan semuanya", () => {
    const s = useCartStore.getState()
    s.addItem(makeProduct())
    s.setDiscount(1000)
    s.setPaymentMethod("CASH")
    s.clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().discount).toBe(0)
    expect(useCartStore.getState().paymentMethod).toBeNull()
  })
})
