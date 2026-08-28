import type { Metadata } from "next"
import { CashierView } from "@/features/cashier/cashier-view"

export const metadata: Metadata = {
  title: "Kasir",
}

export default function KasirPage() {
  return <CashierView />
}