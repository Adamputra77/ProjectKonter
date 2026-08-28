import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CategoriesView } from "@/features/categories/categories-view"

export const metadata: Metadata = {
  title: "Kategori",
}

export default async function KategoriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role === "admin" ? "admin" : "kasir"
  return <CategoriesView role={role} />
}