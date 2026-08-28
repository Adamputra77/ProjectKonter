"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loginSchema, createUserSchema } from "@/lib/validations"

export type AuthState = { error: string | null; success?: string }

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      console.error("signIn auth error:", error.status, error.code, error.message)
      if (error.status === 400 && /invalid login credentials/i.test(error.message)) {
        return { error: "Email atau password salah." }
      }
      return {
        error: "Gagal masuk: " + (error.message || "kesalahan tidak dikenal") + ".",
      }
    }
  } catch (err) {
    console.error("signIn gagal terhubung ke Supabase:", err)
    return {
      error:
        "Tidak dapat terhubung ke server autentikasi (" +
        process.env.NEXT_PUBLIC_SUPABASE_URL +
        "). Periksa apakah Supabase berjalan dan URL-nya benar.",
    }
  }

  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/**
 * Membuat user baru (admin saja) — dipanggil dari halaman Pengaturan.
 * User dibuat langsung di Supabase Auth (email confirmed) + profil via trigger.
 */
export async function createUser(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Tidak terautentikasi." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return { error: "Hanya admin yang dapat membuat user." }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      role: parsed.data.role,
    },
  })

  if (error) return { error: error.message }

  revalidatePath("/pengaturan")
  return { error: null, success: "User berhasil dibuat." }
}

/**
 * Nonaktifkan / aktifkan user (admin).
 */
export async function setUserActive(
  userId: string,
  active: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Tidak terautentikasi." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return { error: "Hanya admin yang dapat mengubah user." }
  }

  const admin = createAdminClient()
  const { error: err } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId)

  if (err) return { error: err.message }

  revalidatePath("/pengaturan")
  return {}
}