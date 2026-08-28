import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProductsView } from "@/features/products/products-view"

export const metadata: Metadata = {
  title: "Produk",
}

export default async function ProdukPage() {
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
  return <ProductsView role={role} />
}