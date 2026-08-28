"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, Download, Smartphone } from "lucide-react"
import { fetchStoreSettings, fetchPrinterSettings } from "@/lib/services/data"
import { buildReceiptBytes, buildReceiptLines } from "@/lib/printer/receipt"
import { printBytes, printBluetoothHint } from "@/lib/printer/print-service"
import type { ReceiptData } from "@/lib/printer/receipt"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: Omit<ReceiptData, "store">
  onClose?: () => void
}

export function ReceiptPreviewDialog({ open, onOpenChange, data }: Props) {
  const [printing, setPrinting] = useState(false)

  const { data: store } = useQuery({ queryKey: ["store-settings"], queryFn: fetchStoreSettings })
  const { data: printer } = useQuery({ queryKey: ["printer-settings"], queryFn: fetchPrinterSettings })

  // Reset state cetak saat dialog dibuka (adjusting state during render — pola resmi React)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setPrinting(false)
  }

  const full: ReceiptData | null = store && data ? { store, ...data } : null
  const lines = full ? buildReceiptLines(full) : []

  const doPrint = async () => {
    if (!full) return
    setPrinting(true)
    try {
      const bytes = buildReceiptBytes(full)
      const res = await printBytes(bytes, full.invoice_number)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    } finally {
      setPrinting(false)
    }
  }

  const doSave = async () => {
    if (!full) return
    const bytes = buildReceiptBytes(full)
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${full.invoice_number}.bin`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("File struk disimpan.")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Struk ({printer?.paper_width_mm ?? 58}mm)</DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto rounded-lg border bg-white p-3 font-mono text-[13px] font-medium leading-relaxed text-black shadow-inner">
          {lines.map((l, i) => (
            <div
              key={i}
              className={
                l.style === "title"
                  ? "text-sm font-black"
                  : l.style === "bold" || l.style === "subtitle"
                    ? "font-bold"
                    : ""
              }
              style={{
                textAlign: l.align ?? "left",
                whiteSpace: "pre",
                letterSpacing: l.style === "title" ? "1px" : undefined,
              }}
            >
              {l.text || "\u00a0"}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button className="w-full" onClick={doPrint} disabled={printing}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Cetak Sekarang
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={doSave}>
              <Download className="mr-2 h-4 w-4" />
              Simpan .bin
            </Button>
            <Button variant="outline" onClick={() => toast.info(printBluetoothHint().message)}>
              <Smartphone className="mr-2 h-4 w-4" />
              Lewat HP
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
