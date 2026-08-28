import { createClient } from "@/lib/supabase/client"
import type {
  Category,
  LowStockProduct,
  Product,
  ProductReportRow,
  ReportRangeKey,
  ReportSummary,
  SalesChartPoint,
  StockMovement,
  StoreSettings,
  TopProduct,
  Transaction,
  PrinterSettings,
} from "@/types"

export function dateRangeForKey(key: ReportRangeKey): { start: Date; end: Date } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  switch (key) {
    case "today":
      return { start: startOfDay(now), end: now }
    case "yesterday": {
      const start = startOfDay(now)
      start.setDate(start.getDate() - 1)
      return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 23, 59, 59) }
    }
    case "last_7_days": {
      const start = startOfDay(now)
      start.setDate(start.getDate() - 6)
      return { start, end: now }
    }
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      }
    case "custom":
      return { start: startOfDay(now), end: now }
  }
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ---------------------------------------------------------------------------
// Produk
// ---------------------------------------------------------------------------

export async function fetchProducts(search?: string, kategoriId?: string, activeOnly = false) {
  const supabase = createClient()

  let query = supabase
    .from("products")
    .select("*, categories(id, name)")
    .order("nama_produk", { ascending: true })

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  if (search && search.trim()) {
    const s = search.trim()
    query = query.or(`nama_produk.ilike.%${s}%,kode_produk.ilike.%${s}%`)
  }

  if (kategoriId && kategoriId !== "all") {
    query = query.eq("kategori_id", kategoriId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as (Product & { categories: { id: string; name: string } | null })[]
}

// ---------------------------------------------------------------------------
// Kategori
// ---------------------------------------------------------------------------

export async function fetchCategories() {
  const supabase = createClient()
  const { data, error } = await supabase.from("categories").select("*").order("name")
  if (error) throw new Error(error.message)
  return (data ?? []) as Category[]
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function fetchDashboardSummary() {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("dashboard_summary")
  if (error) throw new Error(error.message)
  return data as {
    today: { omzet: number; profit: number; transaction_count: number; items_sold: number }
    month: { omzet: number; profit: number; transaction_count: number; items_sold: number }
    totals: { total_products: number; total_stock: number; low_stock: number }
  }
}

export async function fetchSalesChart(days: number) {
  const supabase = createClient()
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))

  const { data, error } = await supabase.rpc("sales_chart", {
    p_start: toDateKey(start),
    p_end: toDateKey(end),
  })
  if (error) throw new Error(error.message)

  const byDate = new Map<string, SalesChartPoint>()
  for (const row of (data ?? []) as SalesChartPoint[]) byDate.set(row.tanggal, row)

  // Isi tanggal kosong dengan 0 supaya grafik kontinu
  const points: SalesChartPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = toDateKey(d)
    points.push(
      byDate.get(key) ?? {
        tanggal: key,
        omzet: 0,
        profit: 0,
        transaksi: 0,
      }
    )
  }
  return points
}

export async function fetchTopProducts(limit = 5) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("top_products", { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data ?? []) as TopProduct[]
}

export async function fetchLowStock() {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("low_stock")
  if (error) throw new Error(error.message)
  return (data ?? []) as LowStockProduct[]
}

export async function fetchRecentTransactions(limit = 8) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as (Transaction & { profiles: { full_name: string } | null })[]
}

// ---------------------------------------------------------------------------
// Stok / pergerakan stok
// ---------------------------------------------------------------------------

export async function fetchStockMovements(limit = 100) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, products(id, nama_produk, kode_produk)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as (StockMovement & { products: { id: string; nama_produk: string; kode_produk: string } | null })[]
}

// ---------------------------------------------------------------------------
// Transaksi & laporan
// ---------------------------------------------------------------------------

export async function fetchTransactions(range: ReportRangeKey, limit = 100) {
  const supabase = createClient()
  const { start, end } = dateRangeForKey(range)

  let query = supabase
    .from("transactions")
    .select("*, profiles(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (range !== "custom") {
    query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as (Transaction & { profiles: { id: string; full_name: string } | null })[]
}

export async function fetchTransactionDetail(transactionId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles(id, full_name), transaction_items(*)")
    .eq("id", transactionId)
    .single()
  if (error) throw new Error(error.message)
  return data as Transaction & {
    profiles: { id: string; full_name: string } | null
    transaction_items: import("@/types").TransactionItem[]
  }
}

export async function fetchReportSummary(range: ReportRangeKey, customStart?: string, customEnd?: string) {
  const supabase = createClient()
  let start: Date, end: Date
  if (range === "custom" && customStart && customEnd) {
    start = new Date(customStart)
    end = new Date(customEnd)
  } else {
    const r = dateRangeForKey(range)
    start = r.start
    end = r.end
  }

  const { data, error } = await supabase.rpc("report_summary", {
    p_start: toDateKey(start),
    p_end: toDateKey(end),
  })
  if (error) throw new Error(error.message)
  return data as ReportSummary
}

export async function fetchProductReport(range: ReportRangeKey, customStart?: string, customEnd?: string) {
  const supabase = createClient()
  let start: Date, end: Date
  if (range === "custom" && customStart && customEnd) {
    start = new Date(customStart)
    end = new Date(customEnd)
  } else {
    const r = dateRangeForKey(range)
    start = r.start
    end = r.end
  }

  const { data, error } = await supabase.rpc("product_report", {
    p_start: toDateKey(start),
    p_end: toDateKey(end),
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as ProductReportRow[]
}

// ---------------------------------------------------------------------------
// Pengaturan
// ---------------------------------------------------------------------------

export async function fetchStoreSettings() {
  const supabase = createClient()
  const { data, error } = await supabase.from("store_settings").select("*").single()
  if (error) throw new Error(error.message)
  return data as StoreSettings
}

export async function fetchPrinterSettings() {
  const supabase = createClient()
  const { data, error } = await supabase.from("printer_settings").select("*").single()
  if (error) throw new Error(error.message)
  return data as PrinterSettings
}