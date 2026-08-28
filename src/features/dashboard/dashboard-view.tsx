"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchDashboardSummary,
  fetchLowStock,
  fetchRecentTransactions,
  fetchSalesChart,
  fetchTopProducts,
} from "@/lib/services/data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Banknote,
  Coins,
  ReceiptText,
  Package,
  PackageMinus,
  Boxes,
  TrendingUp,
  ShoppingBag,
} from "lucide-react"
import { formatCurrency, formatNumber, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils/format"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboardSummary })
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  loading,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  tone: "default" | "green" | "blue" | "amber"
  loading?: boolean
}) {
  const toneClasses = {
    default: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-sky-500/10 text-sky-600",
    amber: "bg-amber-500/10 text-amber-600",
  }[tone]

  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl">{value}</p>
          )}
          {sub && <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{sub}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const { data, isLoading, isError } = useDashboard()
  const chart7 = useQuery({ queryKey: ["sales-chart", 7], queryFn: () => fetchSalesChart(7) })
  const chartMonth = useQuery({
    queryKey: ["sales-chart", 30],
    queryFn: () => fetchSalesChart(30),
  })
  const topProducts = useQuery({ queryKey: ["top-products"], queryFn: () => fetchTopProducts(5) })
  const lowStock = useQuery({ queryKey: ["low-stock"], queryFn: fetchLowStock })
  const recent = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: () => fetchRecentTransactions(8),
  })

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Gagal memuat data dashboard. Periksa koneksi ke database.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan performa toko Anda</p>
      </div>

      {/* Kartu statistik utama */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Omzet Hari Ini"
          value={formatCurrency(data?.today.omzet)}
          sub="Penjualan hari ini"
          icon={Banknote}
          tone="green"
          loading={isLoading}
        />
        <StatCard
          label="Omzet Bulan Ini"
          value={formatCurrency(data?.month.omzet)}
          sub="Penjualan bulan berjalan"
          icon={Banknote}
          tone="blue"
          loading={isLoading}
        />
        <StatCard
          label="Profit Hari Ini"
          value={formatCurrency(data?.today.profit)}
          sub="Keuntungan hari ini"
          icon={Coins}
          tone="green"
          loading={isLoading}
        />
        <StatCard
          label="Profit Bulan Ini"
          value={formatCurrency(data?.month.profit)}
          sub="Keuntungan bulan berjalan"
          icon={Coins}
          tone="blue"
          loading={isLoading}
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={formatNumber(data?.today.transaction_count)}
          sub={`${formatNumber(data?.today.items_sold)} barang terjual`}
          icon={ReceiptText}
          tone="default"
          loading={isLoading}
        />
        <StatCard
          label="Total Produk"
          value={formatNumber(data?.totals.total_products)}
          sub="Produk aktif"
          icon={Package}
          tone="default"
          loading={isLoading}
        />
        <StatCard
          label="Total Stok"
          value={formatNumber(data?.totals.total_stock)}
          sub="Semua produk"
          icon={Boxes}
          tone="amber"
          loading={isLoading}
        />
        <StatCard
          label="Stok Menipis"
          value={formatNumber(data?.totals.low_stock)}
          sub="Perlu restock"
          icon={PackageMinus}
          tone="amber"
          loading={isLoading}
        />
      </div>

      {/* Grafik */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Penjualan 7 Hari Terakhir</CardTitle>
            <CardDescription>Omzet harian</CardDescription>
          </CardHeader>
          <CardContent>
            {chart7.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={chart7.data ?? []} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="omzet7" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="tanggal"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v / 1000) + "k"} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="omzet" stroke="#10b981" fill="url(#omzet7)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Penjualan Bulan Berjalan</CardTitle>
            <CardDescription>30 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {chartMonth.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartMonth.data ?? []} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v / 1000) + "k"} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="omzet" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produk terlaris + stok menipis */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (topProducts.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan.</p>
            ) : (
              (topProducts.data ?? []).map((p, i) => (
                <div key={p.product_id ?? p.nama} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nama}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(p.qty)} terjual</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(p.revenue)}</p>
                    <p className="text-xs text-emerald-600">+{formatCurrency(p.profit)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageMinus className="h-4 w-4 text-amber-600" />
              Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (lowStock.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Semua stok aman. Tidak ada produk menipis.
              </p>
            ) : (
              (lowStock.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nama_produk}</p>
                    <p className="text-xs text-muted-foreground">{p.kode_produk}</p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    Sisa {formatNumber(p.stok)} {p.satuan}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaksi terbaru */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {recent.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (recent.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
          ) : (
            <div className="divide-y">
              {(recent.data ?? []).map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(t.created_at)} · {t.profiles?.full_name ?? "Kasir"}
                    </p>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    {PAYMENT_METHOD_LABELS[t.payment_method]}
                  </Badge>
                  <p className="text-sm font-semibold">{formatCurrency(t.total)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}