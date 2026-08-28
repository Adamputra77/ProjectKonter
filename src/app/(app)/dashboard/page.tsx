import type { Metadata } from "next"
import { DashboardView } from "@/features/dashboard/dashboard-view"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Ringkasan performa toko hari ini dan bulan ini.",
}

export default function DashboardPage() {
  return <DashboardView />
}