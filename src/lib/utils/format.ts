export const PAYMENT_METHODS = ["CASH", "TRANSFER", "QRIS", "DEBIT", "EWALLET"] as const

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  DEBIT: "Debit",
  EWALLET: "E-Wallet",
}

export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-800",
  TRANSFER: "bg-sky-100 text-sky-800",
  QRIS: "bg-violet-100 text-violet-800",
  DEBIT: "bg-amber-100 text-amber-800",
  EWALLET: "bg-rose-100 text-rose-800",
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return "Rp0"
  return currencyFormatter.format(num)
}

export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return "0"
  return numberFormatter.format(num)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function toRpInput(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return ""
  return num.toLocaleString("id-ID")
}

export function parseApiNumber(value: number | string | null | undefined): number {
  const num = Number(value ?? 0)
  return Number.isNaN(num) ? 0 : num
}