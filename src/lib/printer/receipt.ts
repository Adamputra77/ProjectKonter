import type { PaymentMethod, StoreSettings } from "@/types"
import { PAYMENT_METHOD_LABELS } from "@/lib/utils/format"
import {
  PAPER_58MM,
  dashedLine,
  encodeQRCode,
  encodeReceipt,
  fitWidth,
  twoColumn,
  type ReceiptLine,
} from "./escpos"

export interface ReceiptItem {
  nama: string
  quantity: number
  price: number
  subtotal: number
}

export interface ReceiptData {
  store: Pick<StoreSettings, "store_name" | "address" | "phone" | "receipt_footer">
  invoice_number: string
  created_at: string
  cashier_name: string
  payment_method: PaymentMethod
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  paid_amount: number
  change_amount: number
}

export function formatRp(value: number): string {
  return "Rp" + value.toLocaleString("id-ID")
}

/** Bangun baris-baris struk dari data transaksi (58mm default). */
export function buildReceiptLines(data: ReceiptData): ReceiptLine[] {
  const W = PAPER_58MM
  const lines: ReceiptLine[] = []
  const d = dashedLine("-", W)
  const D = dashedLine("=", W)

  lines.push(D)
  if (data.store.store_name) {
    lines.push({ text: data.store.store_name, align: "center", style: "title" })
  }
  if (data.store.address) {
    lines.push({ text: data.store.address, align: "center" })
  }
  if (data.store.phone) {
    lines.push({ text: "Telp: " + data.store.phone, align: "center" })
  }
  lines.push(D)
  lines.push({ text: `No: ${data.invoice_number}` })
  lines.push({ text: data.created_at })
  lines.push({ text: `Kasir: ${fitWidth(data.cashier_name || "-", W)}` })
  lines.push(d)

  for (const item of data.items) {
    const line1 = twoColumn(item.nama, `${item.quantity} x ${formatRp(item.price)}`)
    lines.push(line1)
    lines.push({ text: formatRp(item.subtotal), align: "right" })
  }

  lines.push(d)
  lines.push(twoColumn("Subtotal", formatRp(data.subtotal)))
  if (data.discount > 0) {
    lines.push(twoColumn("Diskon", "-" + formatRp(data.discount)))
  }
  lines.push({ text: twoColumn("TOTAL", formatRp(data.total)).text, style: "bold" })
  lines.push(twoColumn("Bayar", formatRp(data.paid_amount)))
  lines.push(twoColumn("Kembalian", formatRp(data.change_amount)))
  lines.push({ text: "Pembayaran: " + PAYMENT_METHOD_LABELS[data.payment_method] })
  lines.push(D)

  if (data.store.receipt_footer) {
    for (const line of data.store.receipt_footer.split("\n")) {
      lines.push({ text: line.trim(), align: "center" })
    }
    lines.push(D)
  }

  lines.push({ text: "Terima kasih!", align: "center", style: "bold" })
  lines.push({ text: "Barang yang sudah dibeli", align: "center" })
  lines.push({ text: "tidak dapat ditukar/dikembalikan", align: "center" })

  return lines
}

/** Struk lengkap sebagai byte ESC/POS (termasuk QR invoice + potong kertas). */
export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const lines = buildReceiptLines(data)
  const qr = encodeQRCode("2", 8, "M", data.invoice_number)
  const buf: number[] = []
  for (const b of encodeReceipt(lines)) buf.push(b)
  buf.push(0x1b, 0x61, 0x01) // center untuk QR
  for (const b of qr) buf.push(b)
  return new Uint8Array(buf)
}
