"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Banknote, Package, TrendingUp, ReceiptText, ShoppingBasket } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchReportSummary, fetchProductReport } from "@/lib/services/data"
import { formatCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import type { ReportRangeKey } from "@/types"

const RANGES: { key: ReportRangeKey; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "last_7_days", label: "7 Hari" },
  { key: "this_month", label: "Bulan Ini" },
  { key: "last_month", label: "Bulan Lalu" },
]

export function ReportsView() {
  const [range, setRange] = useState<ReportRangeKey>("this_month")

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["report-summary", range],
    queryFn: () => fetchReportSummary(range),
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["product-report", range],
    queryFn: () => fetchProductReport(range),
  })

  const statCards = useMemo(() => {
    const s = summary ?? {
      omzet: 0,
      modal: 0,
      profit: 0,
      transaksi: 0,
      items_terjual: 0,
    }
    const margin = s.omzet > 0 ? ((s.profit / s.omzet) * 100).toFixed(1) : "0"
    return [
      {
        label: "Omzet",
        value: formatCurrency(s.omzet),
        icon: Banknote,
        iconClass: "text-emerald-600",
      },
      {
        label: "Profit",
        value: formatCurrency(s.profit),
        icon: TrendingUp,
        iconClass: "text-blue-600",
      },
      {
        label: "Margin",
        value: `${margin}%`,
        icon: Package,
        iconClass: "text-violet-600",
      },
      {
        label: "Transaksi",
        value: String(s.transaksi),
        icon: ReceiptText,
        iconClass: "text-amber-600",
      },
      {
        label: "Item Terjual",
        value: String(s.items_terjual),
        icon: ShoppingBasket,
        iconClass: "text-rose-600",
      },
    ]
  }, [summary])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground">Ringkasan penjualan &amp; profit</p>
        </div>
        <div className="w-full overflow-x-auto sm:w-auto">
          <Tabs value={range} onValueChange={(v) => setRange(v as ReportRangeKey)}>
            <TabsList className="w-full whitespace-nowrap sm:w-auto">
              {RANGES.map((r) => (
                <TabsTrigger key={r.key} value={r.key}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {statCards.map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <c.icon className={cn("h-4 w-4", c.iconClass)} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <p className="text-lg font-bold">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Produk Terjual</CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (products ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada penjualan pada periode ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Terjual</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products ?? []).map((p, i) => (
                    <TableRow key={p.product_id ?? p.nama}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.nama}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatCurrency(p.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}