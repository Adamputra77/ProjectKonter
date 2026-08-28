import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TransactionsView } from "@/features/transactions/transactions-view"

export const metadata: Metadata = {
  title: "Transaksi",
}

export default async function TransaksiPage() {
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
  return <TransactionsView role={role} />
}