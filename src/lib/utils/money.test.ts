import { describe, expect, it } from "vitest"
import {
  calcChange,
  calcItemSubtotal,
  calcSubtotal,
  calcTotal,
  toCents,
  validatePayment,
} from "@/lib/utils/money"

describe("toCents", () => {
  it("membulatkan ke integer terdekat", () => {
    expect(toCents(1000.2)).toBe(1000)
    expect(toCents(1000.7)).toBe(1001)
  })
})

describe("calcSubtotal", () => {
  it("menjumlahkan quantity × harga", () => {
    const items = [
      { quantity: 2, harga_jual: 15000 },
      { quantity: 1, harga_jual: 3500000 },
    ]
    expect(calcSubtotal(items)).toBe(3530000)
  })

  it("mengembalikan 0 untuk daftar kosong", () => {
    expect(calcSubtotal([])).toBe(0)
  })
})

describe("calcItemSubtotal", () => {
  it("menghitung subtotal per item", () => {
    expect(calcItemSubtotal({ quantity: 3, harga_jual: 10000 })).toBe(30000)
  })
})

describe("calcTotal", () => {
  it("mengurangi diskon dari subtotal", () => {
    expect(calcTotal(100000, 15000)).toBe(85000)
  })

  it("tidak pernah negatif walau diskon melebihi subtotal", () => {
    expect(calcTotal(50000, 100000)).toBe(0)
  })
})

describe("calcChange", () => {
  it("menghitung kembalian", () => {
    expect(calcChange(85000, 100000)).toBe(15000)
  })

  it("tidak pernah negatif (bayar kurang dari total)", () => {
    expect(calcChange(85000, 50000)).toBe(0)
  })
})

describe("validatePayment", () => {
  it("menerima pembayaran pas", () => {
    expect(validatePayment(100000, 100000)).toBeNull()
  })

  it("menolak pembayaran kurang", () => {
    const err = validatePayment(100000, 90000)
    expect(err).toMatch(/kurang Rp10.000/)
  })

  it("menolak nilai negatif", () => {
    expect(validatePayment(100000, -5)).toMatch(/tidak valid/)
  })

  it("menolak nilai non-finite", () => {
    expect(validatePayment(100000, NaN)).toMatch(/tidak valid/)
  })
})
