export type Role = "admin" | "kasir"

export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "DEBIT" | "EWALLET"

export type TransactionStatus = "completed" | "cancelled"

export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT"

export interface Profile {
  id: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  kode_produk: string
  nama_produk: string
  kategori_id: string | null
  harga_beli: number
  harga_jual: number
  stok: number
  stok_minimum: number
  satuan: string
  deskripsi: string | null
  gambar: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  categories?: Pick<Category, "id" | "name"> | null
}

export interface StockMovement {
  id: string
  product_id: string
  quantity: number
  type: StockMovementType
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  products?: Pick<Product, "id" | "nama_produk" | "kode_produk"> | null
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string | null
  product_name_snapshot: string
  quantity: number
  price: number
  cost_price: number
  subtotal: number
}

export interface Transaction {
  id: string
  invoice_number: string
  user_id: string
  subtotal: number
  discount: number
  total: number
  paid_amount: number
  change_amount: number
  payment_method: PaymentMethod
  status: TransactionStatus
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  created_at: string
  profiles?: Pick<Profile, "id" | "full_name"> | null
}

export interface StoreSettings {
  id: number
  store_name: string
  address: string
  phone: string
  receipt_footer: string
  logo_url: string | null
  updated_at: string
}

export interface PrinterSettings {
  id: number
  printer_name: string
  connection_type: string
  paper_width_mm: number
  bluetooth_address: string
  charset: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface CartItem {
  product_id: string
  kode_produk: string
  nama_produk: string
  harga_jual: number
  stok: number
  satuan: string
  quantity: number
  subtotal: number
}

export interface TransactionResult {
  invoice_number: string
  subtotal: number
  discount: number
  total: number
  paid_amount: number
  change_amount: number
  payment_method: PaymentMethod
  user_id: string
  created_at: string
}

export interface DashboardSummary {
  today: {
    omzet: number
    profit: number
    transaction_count: number
    items_sold: number
  }
  month: {
    omzet: number
    profit: number
    transaction_count: number
    items_sold: number
  }
  totals: {
    total_products: number
    total_stock: number
    low_stock: number
  }
}

export interface SalesChartPoint {
  tanggal: string
  omzet: number
  profit: number
  transaksi: number
}

export interface TopProduct {
  product_id: string | null
  nama: string
  qty: number
  revenue: number
  profit: number
}

export interface LowStockProduct {
  id: string
  kode_produk: string
  nama_produk: string
  stok: number
  stok_minimum: number
  satuan: string
  kategori: string | null
}

export interface ReportSummary {
  omzet: number
  modal: number
  profit: number
  transaksi: number
  items_terjual: number
}

export interface ProductReportRow {
  product_id: string | null
  nama: string
  qty: number
  revenue: number
  profit: number
}

export type ReportRangeKey =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "custom"