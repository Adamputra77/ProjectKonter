import { z } from "zod"

export const loginSchema = z.object({
  email: z.email("Email tidak valid").trim(),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const createUserSchema = z.object({
  email: z.email("Email tidak valid").trim(),
  password: z.string().min(6, "Password minimal 6 karakter"),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
  role: z.enum(["admin", "kasir"], { message: "Role tidak valid" }),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const productSchema = z.object({
  kode_produk: z.string().min(1, "Kode produk wajib diisi"),
  nama_produk: z.string().min(1, "Nama produk wajib diisi"),
  kategori_id: z.string().min(1, "Kategori wajib dipilih"),
  harga_beli: z.number().min(0, "Harga beli tidak boleh negatif"),
  harga_jual: z.number().min(0, "Harga jual tidak boleh negatif"),
  stok: z.number().int("Stok harus bilangan bulat").min(0, "Stok tidak boleh negatif"),
  stok_minimum: z
    .number()
    .int("Stok minimum harus bilangan bulat")
    .min(0, "Stok minimum tidak boleh negatif"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  deskripsi: z.string().optional().default(""),
  is_active: z.boolean().default(true),
})

export type ProductFormValues = z.infer<typeof productSchema>

export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  description: z.string().optional().default(""),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const storeSettingsSchema = z.object({
  store_name: z.string().min(1, "Nama toko wajib diisi"),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  receipt_footer: z.string().optional().default(""),
  logo_url: z.string().optional().default(""),
})

export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>

export const printerSettingsSchema = z.object({
  printer_name: z.string().optional().default(""),
  connection_type: z.enum(["bluetooth", "usb", "serial", "network", "native"]),
  paper_width_mm: z.coerce.number().int().refine((v) => v === 58 || v === 80, {
    message: "Lebar kertas harus 58 atau 80 mm",
  }),
  bluetooth_address: z.string().optional().default(""),
})

export type PrinterSettingsFormValues = z.infer<typeof printerSettingsSchema>

export const transactionSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Keranjang kosong"),
  discount: z.number().min(0),
  paid_amount: z.number().min(0),
  payment_method: z.enum(["CASH", "TRANSFER", "QRIS", "DEBIT", "EWALLET"]),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

export const stockAdjustSchema = z.object({
  product_id: z.string().min(1, "Produk wajib dipilih"),
  new_stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  notes: z.string().optional().default(""),
})

export type StockAdjustFormValues = z.infer<typeof stockAdjustSchema>

export const cancelTransactionSchema = z.object({
  reason: z.string().min(1, "Alasan pembatalan wajib diisi"),
})

export type CancelTransactionFormValues = z.infer<typeof cancelTransactionSchema>