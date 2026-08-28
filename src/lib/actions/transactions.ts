"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function cancelTransaction(transactionId: string, reason: string) {
  const admin = createAdminClient()

  const { error } = await admin.rpc("cancel_transaction", {
    p_transaction_id: transactionId,
    p_reason: reason,
  })

  if (error) {
    console.error("cancel_transaction RPC error:", error)
    if (error.message.includes("already") || error.message.includes("completed")) {
      return { error: "Transaksi ini tidak dapat dibatalkan lagi." }
    }
    return { error: "Gagal membatalkan transaksi: " + error.message }
  }

  return { error: null }
}