"use client"

import { useState } from "react"
import { Minus, Plus, Trash2, ShoppingCart, CheckCircle2, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/format"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/utils/format"
import { calcTotal, calcChange, validatePayment } from "@/lib/utils/money"
import { createClient } from "@/lib/supabase/client"
import { fetchStoreSettings } from "@/lib/services/data"
import { buildReceiptBytes, buildReceiptLines } from "@/lib/printer/receipt"
import { useCartStore } from "./cart-store"
import { PaymentSheet } from "./payment-sheet"
import { ReceiptPreviewDialog } from "@/components/printer/receipt-preview-dialog"
import type { CartItem, PaymentMethod, TransactionResult } from "@/types"

function QuickAmountButton({
  amount,
  onClick,
}: {
  amount: number
  onClick: (v: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(amount)}
      className="rounded-md border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
    >
      {formatCurrency(amount).replace(/\s+/g, " ")}
    </button>
  )
}

function CartPanelContent({ onPayment }: { onPayment: (method: PaymentMethod) => void }) {
  const items = useCartStore((s) => s.items)
  const discount = useCartStore((s) => s.discount)
  const setDiscount = useCartStore((s) => s.setDiscount)
  const changeQuantity = useCartStore((s) => s.changeQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const subtotal = useCartStore((s) => s.items.reduce((n, i) => n + i.subtotal, 0))

  const total = calcTotal(subtotal, discount)
  const [paid, setPaid] = useState("")
  const change = calcChange(total, Number(paid || 0))

  const quickAmounts = useMemoQuick(total)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Keranjang kosong</p>
        <p className="text-xs text-muted-foreground">Ketuk produk untuk menambahkan</p>
      </div>
    )
  }

  const pay = (method: PaymentMethod) => {
    const paidValue = method === "CASH" ? Number(paid || 0) : total
    const errTest = validatePayment(total, paidValue)
    if (method === "CASH" && errTest) {
      toast.error(errTest)
      return
    }
    onPayment(method)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 px-4 pt-4">
          {items.map((item) => (
            <div key={item.product_id} className="rounded-lg border bg-card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{item.nama_produk}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(item.harga_jual)} × {item.quantity}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(item.product_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => changeQuantity(item.product_id, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-base font-semibold">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={item.quantity >= item.stok}
                    onClick={() => changeQuantity(item.product_id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(item.subtotal)}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 space-y-3 border-t bg-background p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="cart-discount">Diskon (Rp)</Label>
            <Input
              id="cart-discount"
              type="number"
              min={0}
              className="h-9 w-32 text-right"
              value={discount || ""}
              placeholder="0"
              onChange={(e) => setDiscount(Math.max(Number(e.target.value) || 0, 0))}
            />
          </div>
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-muted-foreground">Tunai</Label>
          <Input
            type="number"
            min={0}
            className="h-12 text-right text-lg"
            placeholder="0"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {quickAmounts.map((a) => (
              <QuickAmountButton key={a} amount={a} onClick={() => setPaid(String(a))} />
            ))}
          </div>
          <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="font-medium">Kembalian</span>
            <span className="font-bold">{formatCurrency(change)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <Button
              key={m}
              variant="outline"
              className={cn(m === "CASH" && "col-span-2 h-11")}
              onClick={() => pay(m)}
            >
              {PAYMENT_METHOD_LABELS[m]}
            </Button>
          ))}
        </div>

        <Button variant="ghost" className="w-full" onClick={clearCart}>
          Kosongkan Keranjang
        </Button>
      </div>
    </div>
  )
}

function useMemoQuick(total: number) {
  const base = [total]
  const ceil = 50000
  const rounded = Math.ceil(total / ceil) * ceil
  if (rounded > total && rounded - total < 200000) base.push(rounded)
  const rounded2 = Math.ceil(total / 100000) * 100000
  if (rounded2 > total && rounded2 - total < 500000) base.push(rounded2)
  return Array.from(new Set(base)).filter((v) => v > 0)
}

export function CartPanel() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([])
  const [receiptOpen, setReceiptOpen] = useState(false)

  const items = useCartStore((s) => s.items)
  const discount = useCartStore((s) => s.discount)
  const subtotal = useCartStore((s) => s.items.reduce((n, i) => n + i.subtotal, 0))
  const total = calcTotal(subtotal, discount)
  const clearCart = useCartStore((s) => s.clearCart)
  const syncStock = useCartStore((s) => s.syncStock)

  const onPayment = (method: PaymentMethod) => {
    setPaymentMethod(method)
  }

  const executePayment = async (paidAmount: number) => {
    if (!paymentMethod) return
    setProcessing(true)
    try {
      const supabase = createClient()
      const payload = {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        discount,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
      }
      const { data, error } = await supabase.rpc("create_transaction", { payload })
      if (error) {
        toast.error(error.message)
        setProcessing(false)
        return
      }
      // Stok di database sudah berkurang — sinkronkan kartu lokal
      for (const i of items) {
        const remaining = Math.max(i.stok - i.quantity, 0)
        syncStock(i.product_id, remaining)
      }
      const tx = data as TransactionResult
      setResult(tx)
      setReceiptItems(items)
      clearCart()
    } catch {
      toast.error("Gagal memproses transaksi.")
      setProcessing(false)
    }
  }

  const shareReceipt = async () => {
    if (!result) return
    let store
    try {
      store = await fetchStoreSettings()
    } catch {
      store = null
    }
    const data = {
      store: store
        ? { store_name: store.store_name, address: store.address, phone: store.phone, receipt_footer: store.receipt_footer }
        : { store_name: "", address: "", phone: "", receipt_footer: "" },
      invoice_number: result.invoice_number,
      created_at: result.created_at,
      cashier_name: "",
      payment_method: result.payment_method,
      items: receiptItems.map((i) => ({
        nama: i.nama_produk,
        quantity: i.quantity,
        price: i.harga_jual,
        subtotal: i.subtotal,
      })),
      subtotal: result.subtotal,
      discount: result.discount,
      total: result.total,
      paid_amount: result.paid_amount,
      change_amount: result.change_amount,
    }
    const bytes = buildReceiptBytes(data)
    const text = buildReceiptLines(data).map((l) => l.text).join("\n")
    const file = new File([new Uint8Array(bytes)], `${result.invoice_number}.bin`, {
      type: "application/octet-stream",
    })

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: `Struk ${result.invoice_number}`, text, files: [file] })
        return
      } catch {
        // user batal / share tidak didukung files — fallback simpan file
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    toast.success("File struk disimpan.")
  }

  if (result) {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Transaksi Berhasil!</h3>
          <p className="font-mono text-sm text-muted-foreground">{result.invoice_number}</p>
        </div>
        <div className="w-full space-y-1.5 rounded-xl border bg-card p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(result.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Diskon</span><span>-{formatCurrency(result.discount)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(result.total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bayar</span><span>{formatCurrency(result.paid_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Kembalian</span><span className="font-semibold text-emerald-600">{formatCurrency(result.change_amount)}</span></div>
        </div>
        <div className="grid w-full gap-2">
          <Button className="h-12 text-base" onClick={() => setReceiptOpen(true)}>
            Cetak Struk
          </Button>
          <Button variant="outline" className="h-12 text-base" onClick={shareReceipt}>
            <Share className="mr-2 h-4 w-4" />
            Bagikan Struk
          </Button>
          <Button variant="ghost" className="h-12 text-base" onClick={() => setResult(null)}>
            Transaksi Baru
          </Button>
        </div>
        <ReceiptPreviewDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          data={{
            invoice_number: result.invoice_number,
            created_at: result.created_at,
            cashier_name: "",
            payment_method: result.payment_method,
            items: receiptItems.map((i) => ({
              nama: i.nama_produk,
              quantity: i.quantity,
              price: i.harga_jual,
              subtotal: i.subtotal,
            })),
            subtotal: result.subtotal,
            discount: result.discount,
            total: result.total,
            paid_amount: result.paid_amount,
            change_amount: result.change_amount,
          }}
        />
      </div>
    )
  }

  return (
    <>
      <CartPanelContent onPayment={onPayment} />
      <PaymentSheet
        open={!!paymentMethod}
        onOpenChange={(o) => !o && setPaymentMethod(null)}
        method={paymentMethod}
        total={total}
        processing={processing}
        onConfirm={executePayment}
      />
    </>
  )
}