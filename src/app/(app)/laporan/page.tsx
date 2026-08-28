import type { Metadata } from "next"
import { ReportsView } from "@/features/reports/reports-view"

export const metadata: Metadata = {
  title: "Laporan",
}

export default function LaporanPage() {
  return <ReportsView />
}