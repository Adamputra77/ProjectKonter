"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, ReceiptText, Printer } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchTransactions, fetchTransactionDetail } from "@/lib/services/data"
import { cancelTransaction } from "@/lib/actions/transactions"
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils/format"
import { ReceiptPreviewDialog } from "@/components/printer/receipt-preview-dialog"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types"

const RANGES: { key: string; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "last_7_days", label: "7 Hari Terakhir" },
  { key: "this_month", label: "Bulan Ini" },
  { key: "last_month", label: "Bulan Lalu" },
  { key: "all", label: "Semua" },
]

export function TransactionsView({ role }: { role: "admin" | "kasir" }) {
  const isAdmin = role === "admin"
  const queryClient = useQueryClient()
  const [range, setRange] = useState("last_7_days")
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [cancelTx, setCancelTx] = useState<Transaction | null>(null)
  const [reprintOpen, setReprintOpen] = useState(false)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", range],
    queryFn: () => fetchTransactions(range as never, 200),
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["transaction-detail", detailId],
    queryFn: () => (detailId ? fetchTransactionDetail(detailId) : Promise.reject()),
    enabled: !!detailId,
  })

  const onCancel = async () => {
    if (!cancelTx) return
    if (!cancelReason.trim()) {
      toast.error("Alasan pembatalan wajib diisi.")
      return
    }
    setCancelling(true)
    const res = await cancelTransaction(cancelTx.id, cancelReason.trim())
    setCancelling(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Transaksi ${cancelTx.invoice_number} dibatalkan. Stok dikembalikan.`)
    setCancelTx(null)
    setCancelReason("")
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["transaction-detail"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["stock-movements"] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-sm text-muted-foreground">Riwayat penjualan toko</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.key} value={r.key}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (transactions ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-14 text-center">
            <ReceiptText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground">Transaksi yang berhasil akan muncul di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions ?? []).map((t) => (
                  <TableRow key={t.id} className={cn(t.status === "cancelled" && "opacity-60")}>
                    <TableCell className="font-mono text-xs font-medium">{t.invoice_number}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell className="text-xs">{t.profiles?.full_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(t.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{PAYMENT_METHOD_LABELS[t.payment_method]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === "completed" ? "default" : "destructive"}>
                        {t.status === "completed" ? "Selesai" : "Dibatalkan"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(t.id)}>
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail transaksi */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              {detail?.invoice_number ?? "Memuat..."}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDateTime(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kasir</p>
                  <p className="font-medium">{detail.profiles?.full_name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pembayaran</p>
                  <p className="font-medium">{PAYMENT_METHOD_LABELS[detail.payment_method]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={detail.status === "completed" ? "default" : "destructive"}>
                    {detail.status === "completed" ? "Selesai" : "Dibatalkan"}
                  </Badge>
                </div>
              </div>

              <div className="divide-y rounded-lg border">
                {detail.transaction_items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 p-3">
                    <div>
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(detail.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span>-{formatCurrency(detail.discount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(detail.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bayar</span>
                  <span>{formatCurrency(detail.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(detail.change_amount)}</span>
                </div>
              </div>

              {detail.status === "cancelled" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  Dibatalkan: {detail.cancel_reason ?? "Tanpa alasan"} ·{" "}
                  {formatDateTime(detail.cancelled_at)}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="sm:flex-1" onClick={() => setReprintOpen(true)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak Ulang Struk
                </Button>
                {isAdmin && detail.status === "completed" && (
                  <Button
                    variant="destructive"
                    className="sm:flex-1"
                    onClick={() => setCancelTx(detail as unknown as Transaction)}
                  >
                    Batalkan Transaksi
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Konfirmasi pembatalan */}
      <Dialog open={!!cancelTx} onOpenChange={(o) => !o && setCancelTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi?</DialogTitle>
            <DialogDescription>
              {cancelTx?.invoice_number} — stok akan dikembalikan dan transaksi ditandai dibatalkan
              (tidak dihapus permanen).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Alasan pembatalan (wajib)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelTx(null)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={onCancel} disabled={cancelling}>
                {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ya, Batalkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cetak ulang struk */}
      <ReceiptPreviewDialog
        open={reprintOpen}
        onOpenChange={setReprintOpen}
        data={
          detail && !detailLoading
            ? {
                invoice_number: detail.invoice_number,
                created_at: formatDateTime(detail.created_at),
                cashier_name: detail.profiles?.full_name ?? "",
                payment_method: detail.payment_method,
                items: detail.transaction_items.map((it) => ({
                  nama: it.product_name_snapshot,
                  quantity: it.quantity,
                  price: it.price,
                  subtotal: it.subtotal,
                })),
                subtotal: detail.subtotal,
                discount: detail.discount,
                total: detail.total,
                paid_amount: detail.paid_amount,
                change_amount: detail.change_amount,
              }
            : undefined
        }
      />
    </div>
  )
}