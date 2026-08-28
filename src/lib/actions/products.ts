"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { productSchema, categorySchema } from "@/lib/validations"

export type FormActionState = { error: string | null; success?: string }

export async function requireAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") return null
  return user
}

async function logAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  const admin = createAdminClient()
  await admin.from("audit_logs").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    details: details ?? {},
  })
}

// ---------------------------------------------------------------------------
// PRODUK
// ---------------------------------------------------------------------------

export async function createProduct(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat menambah produk." }

  const parsed = productSchema.safeParse({
    kode_produk: formData.get("kode_produk"),
    nama_produk: formData.get("nama_produk"),
    kategori_id: formData.get("kategori_id"),
    harga_beli: Number(formData.get("harga_beli")),
    harga_jual: Number(formData.get("harga_jual")),
    stok: Number(formData.get("stok")),
    stok_minimum: Number(formData.get("stok_minimum")),
    satuan: formData.get("satuan"),
    deskripsi: formData.get("deskripsi"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...parsed.data,
      deskripsi: parsed.data.deskripsi || null,
      is_active: true,
    })
    .select("id, kode_produk")
    .single()

  if (error) {
    if (error.code === "23505") return { error: "Kode produk sudah digunakan." }
    return { error: error.message }
  }

  await logAudit(user.id, "create_product", "product", data.id, {
    kode_produk: parsed.data.kode_produk,
    nama_produk: parsed.data.nama_produk,
  })
  revalidatePath("/produk")
  revalidatePath("/stok")
  return { error: null, success: "Produk berhasil ditambahkan." }
}

export async function updateProduct(
  productId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat mengubah produk." }

  const parsed = productSchema.safeParse({
    kode_produk: formData.get("kode_produk"),
    nama_produk: formData.get("nama_produk"),
    kategori_id: formData.get("kategori_id"),
    harga_beli: Number(formData.get("harga_beli")),
    harga_jual: Number(formData.get("harga_jual")),
    stok: Number(formData.get("stok")),
    stok_minimum: Number(formData.get("stok_minimum")),
    satuan: formData.get("satuan"),
    deskripsi: formData.get("deskripsi"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .update({
      kode_produk: parsed.data.kode_produk,
      nama_produk: parsed.data.nama_produk,
      kategori_id: parsed.data.kategori_id,
      harga_beli: parsed.data.harga_beli,
      harga_jual: parsed.data.harga_jual,
      stok: parsed.data.stok,
      stok_minimum: parsed.data.stok_minimum,
      satuan: parsed.data.satuan,
      deskripsi: parsed.data.deskripsi || null,
    })
    .eq("id", productId)
    .select("id, kode_produk")
    .single()

  if (error) {
    if (error.code === "23505") return { error: "Kode produk sudah digunakan." }
    return { error: error.message }
  }

  await logAudit(user.id, "update_product", "product", data.id, {
    kode_produk: parsed.data.kode_produk,
  })
  revalidatePath("/produk")
  revalidatePath("/stok")
  return { error: null, success: "Produk berhasil diperbarui." }
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat mengubah produk." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("id, kode_produk")
    .single()

  if (error) return { error: error.message }

  await logAudit(user.id, isActive ? "activate_product" : "deactivate_product", "product", data.id, {
    kode_produk: data.kode_produk,
  })
  revalidatePath("/produk")
  revalidatePath("/stok")
  return {}
}

// ---------------------------------------------------------------------------
// STOK
// ---------------------------------------------------------------------------

export async function adjustStock(productId: string, newStock: number, notes: string) {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat menyesuaikan stok." }

  const supabase = await createClient()
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_new_stock: newStock,
    p_notes: notes,
  })

  if (error) return { error: error.message }
  revalidatePath("/stok")
  return {}
}

// ---------------------------------------------------------------------------
// KATEGORI
// ---------------------------------------------------------------------------

export async function createCategory(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat menambah kategori." }

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { error: "Nama kategori sudah digunakan." }
    return { error: error.message }
  }

  await logAudit(user.id, "create_category", "category", data.id, { name: parsed.data.name })
  revalidatePath("/kategori")
  return { error: null, success: "Kategori berhasil ditambahkan." }
}

export async function updateCategory(
  categoryId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat mengubah kategori." }

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", categoryId)
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { error: "Nama kategori sudah digunakan." }
    return { error: error.message }
  }

  await logAudit(user.id, "update_category", "category", data.id, { name: parsed.data.name })
  revalidatePath("/kategori")
  revalidatePath("/produk")
  return { error: null, success: "Kategori berhasil diperbarui." }
}

export async function deleteCategory(categoryId: string) {
  const user = await requireAdminUser()
  if (!user) return { error: "Hanya admin yang dapat menghapus kategori." }

  const supabase = await createClient()

  // Produk dengan kategori ini otomatis dikosongkan (FK set null) —
  // historis transaksi tetap aman karena pakai snapshot.
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .select("name")
    .single()

  if (error) return { error: error.message }

  await logAudit(user.id, "delete_category", "category", categoryId, { name: data?.name })
  revalidatePath("/kategori")
  revalidatePath("/produk")
  return {}
}