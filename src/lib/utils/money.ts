import type { CartItem } from "@/types"

/**
 * Fungsi perhitungan POS murni — mudah diuji tanpa UI/database.
 * Semua operasional memakai integer dalam Rupiah untuk menghindari
 * error pembulatan floating-point pada uang.
 */

export function toCents(value: number): number {
  return Math.round(value)
}

export function calcSubtotal(items: Pick<CartItem, "quantity" | "harga_jual">[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.harga_jual, 0)
}

export function calcItemSubtotal(item: Pick<CartItem, "quantity" | "harga_jual">): number {
  return item.quantity * item.harga_jual
}

export function calcTotal(subtotal: number, discount: number): number {
  return Math.max(subtotal - discount, 0)
}

export function calcChange(total: number, paid: number): number {
  return Math.max(paid - total, 0)
}

/**
 * Memvalidasi jumlah pembayaran.
 * Mengembalikan pesan error dalam Bahasa Indonesia, atau null jika valid.
 */
export function validatePayment(total: number, paid: number): string | null {
  if (!Number.isFinite(paid) || paid < 0) {
    return "Jumlah pembayaran tidak valid."
  }
  if (paid < total) {
    return `Jumlah pembayaran kurang Rp${(total - paid).toLocaleString("id-ID")}.`
  }
  return null
}