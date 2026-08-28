"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Banknote, Smartphone } from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { PAYMENT_METHOD_LABELS } from "@/lib/utils/format"
import { calcChange, validatePayment } from "@/lib/utils/money"
import { cn } from "@/lib/utils"
import type { PaymentMethod } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethod | null
  total: number
  processing: boolean
  onConfirm: (paidAmount: number) => void
}

export function PaymentSheet({ open, onOpenChange, method, total, processing, onConfirm }: Props) {
  const [paid, setPaid] = useState("")
  const isCash = method === "CASH"

  // Reset input saat dialog dibuka (adjusting state during render — pola resmi React)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setPaid("")
  }

  const paidValue = isCash ? Number(paid || 0) : total
  const change = calcChange(total, paidValue)
  const error = isCash ? validatePayment(total, paidValue) : null

  const quickAmounts = useMemo(() => {
    const amounts = new Set<number>([total])
    for (const step of [10000, 20000, 50000, 100000, 200000, 500000]) {
      const r = Math.ceil(total / step) * step
      if (r > total && r - total <= 500000) amounts.add(r)
    }
    return Array.from(amounts).sort((a, b) => a - b).slice(0, 6)
  }, [total])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCash ? <Banknote className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            Pembayaran {method ? PAYMENT_METHOD_LABELS[method] : ""}
          </DialogTitle>
          <DialogDescription>
            Total tagihan {formatCurrency(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isCash && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setPaid(String(a))}
                    className="rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Jumlah Diterima</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  autoFocus
                  className={cn("h-14 text-right text-2xl font-bold", error && "border-destructive")}
                  placeholder="0"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/40">
                <span className="text-sm text-emerald-700 dark:text-emerald-400">Kembalian</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          {!isCash && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              {method === "QRIS" && (
                <p>
                  Minta pelanggan memindai kode QRIS senilai{" "}
                  <strong>{formatCurrency(total)}</strong>. Konfirmasi pembayaran masuk di
                  aplikasi/merchant QRIS sebelum menyelesaikan transaksi.
                </p>
              )}
              {method !== "QRIS" && (
                <p>
                  Konfirmasi pembayaran {PAYMENT_METHOD_LABELS[method ?? "TRANSFER"]} senilai{" "}
                  <strong>{formatCurrency(total)}</strong> sudah diterima.
                </p>
              )}
            </div>
          )}

          <Button
            className="h-12 w-full text-base"
            disabled={processing || !!error}
            onClick={() => onConfirm(paidValue)}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>Bayar {formatCurrency(total)}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}