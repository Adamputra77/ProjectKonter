import { describe, expect, it } from "vitest"
import {
  PAPER_58MM,
  buildTestReceipt,
  centerText,
  dashedLine,
  encodeLine,
  encodeQRCode,
  encodeReceipt,
  fitWidth,
  twoColumn,
} from "@/lib/printer/escpos"
import { buildReceiptLines, formatRp } from "@/lib/printer/receipt"
import type { ReceiptData } from "@/lib/printer/receipt"

describe("escpos helpers", () => {
  it("fitWidth memotong teks ke lebar kolom (karakter lebar dihitung 2)", () => {
    expect(fitWidth("ABCDE", 3)).toBe("ABC")
    expect(fitWidth("Indonesia", 5)).toBe("Indon")
  })

  it("dashedLine menghasilkan garis selebar kertas", () => {
    expect(dashedLine("-").text.length).toBe(PAPER_58MM)
  })

  it("centerText menggeser teks ke tengah (padding kiri)", () => {
    const c = centerText("X", 10)
    expect(c.length).toBe(5) // 1 karakter + 4 spasi kiri (floor((10-1)/2))
    expect(c.trim().length).toBe(1)
  })

  it("twoColumn menyusun nama & harga dengan harga di kanan", () => {
    const line = twoColumn("iPhone 13", "Rp12.000.000", 32)
    expect(line.text.endsWith("Rp12.000.000")).toBe(true)
    expect(line.text.indexOf("Rp12.000.000")).toBeGreaterThan(0)
  })
})

describe("escpos encoding", () => {
  it("encodeLine menghasilkan ESC/POS valid (diawali INIT-nya oleh encodeReceipt)", () => {
    const bytes = encodeLine({ text: "Halo" })
    expect(bytes[0]).toBe(0x1b) // ESC
    expect(bytes[1]).toBe(0x61) // align
    expect([...bytes].slice(-1)[0]).toBe(0x0a) // LF
  })

  it("encodeReceipt berisi INIT dan potong kertas", () => {
    const bytes = encodeReceipt([{ text: "Test" }, { text: "Done" }])
    expect(bytes[0]).toBe(0x1b)
    expect(bytes[1]).toBe(0x40)
    // potong kertas: 1d 56
    const tail = [...bytes].slice(-4)
    expect(tail[0]).toBe(0x1d)
    expect(tail[1]).toBe(0x56)
  })

  it("encodeQRCode menghasilkan perintah QR ESC/POS", () => {
    const qr = encodeQRCode("2", 8, "M", "TRX-001")
    expect([...qr].slice(0, 3)).toEqual([0x1d, 0x28, 0x6b])
  })
})

describe("receipt builder", () => {
  const base: ReceiptData = {
    store: {
      store_name: "KONTER HP",
      address: "Jl. Merdeka No. 1",
      phone: "0812-3456",
      receipt_footer: "Barang dijamin ORIGINAL",
    },
    invoice_number: "TRX-20260812-0001",
    created_at: "2026-08-12 10:00",
    cashier_name: "Admin",
    payment_method: "CASH",
    items: [
      { nama: "Tempered Glass iPhone 13", quantity: 2, price: 25000, subtotal: 50000 },
      { nama: "Charger 20W", quantity: 1, price: 150000, subtotal: 150000 },
    ],
    subtotal: 200000,
    discount: 10000,
    total: 190000,
    paid_amount: 200000,
    change_amount: 10000,
  }

  it("formatRp memformat Rupiah", () => {
    expect(formatRp(190000)).toBe("Rp190.000")
  })

  it("menghasilkan baris dengan header toko, item, total, footer", () => {
    const lines = buildReceiptLines(base)
    const texts = lines.map((l) => l.text)
    expect(texts.some((t) => t.includes("KONTER HP"))).toBe(true)
    expect(texts.some((t) => t.includes("TRX-20260812-0001"))).toBe(true)
    expect(texts.some((t) => t.includes("TOTAL"))).toBe(true)
    expect(texts.some((t) => t.includes("Barang dijamin ORIGINAL"))).toBe(true)
    expect(texts.some((t) => t.includes("Kembalian"))).toBe(true)
  })

  it("menampilkan diskon hanya bila > 0", () => {
    const noDiscount: ReceiptData = { ...base, discount: 0 }
    const texts = buildReceiptLines(noDiscount).map((l) => l.text)
    expect(texts.some((t) => t.includes("Diskon"))).toBe(false)
  })
})

describe("test receipt", () => {
  it("berisi semua style dasar", () => {
    const lines = buildTestReceipt()
    expect(lines.length).toBeGreaterThan(5)
    expect(lines.some((l) => l.style === "title")).toBe(true)
    expect(lines.some((l) => l.style === "bold")).toBe(true)
  })
})
