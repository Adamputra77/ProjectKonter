import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InventoryView } from "@/features/inventory/inventory-view"

export const metadata: Metadata = {
  title: "Stok",
}

export default async function StokPage() {
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
  return <InventoryView role={role} />
}