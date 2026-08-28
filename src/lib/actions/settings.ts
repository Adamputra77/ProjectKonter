"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminUser } from "./products"

export type FormActionState = { error: string | null; success: boolean }

export async function updateStoreSettings(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireAdminUser()
  if (!user) return { error: "Unauthorized", success: false }

  const payload = {
    store_name: String(formData.get("store_name") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    receipt_footer: String(formData.get("receipt_footer") || "").trim(),
  }

  if (!payload.store_name) return { error: "Nama toko wajib diisi.", success: false }

  const admin = createAdminClient()
  const { error } = await admin.from("store_settings").update(payload).eq("id", 1)
  if (error) return { error: "Gagal menyimpan: " + error.message, success: false }

  await admin
    .from("audit_logs")
    .insert({ user_id: user.id, action: "update_store_settings", entity: "store_settings", entity_id: "1", details: { store_name: payload.store_name } })

  return { error: null, success: true }
}

export async function updatePrinterSettings(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireAdminUser()
  if (!user) return { error: "Unauthorized", success: false }

  const payload = {
    printer_name: String(formData.get("printer_name") || "").trim(),
    connection_type: String(formData.get("connection_type") || "serial"),
    paper_width_mm: Number(formData.get("paper_width_mm") || 58),
    bluetooth_address: String(formData.get("bluetooth_address") || "").trim(),
    charset: String(formData.get("charset") || "cp437"),
  }

  const admin = createAdminClient()
  const { error } = await admin.from("printer_settings").update(payload).eq("id", 1)
  if (error) return { error: "Gagal menyimpan: " + error.message, success: false }

  await admin
    .from("audit_logs")
    .insert({ user_id: user.id, action: "update_printer_settings", entity: "printer_settings", entity_id: "1", details: payload })

  return { error: null, success: true }
}
