"use client"

import { useEffect, useState } from "react"
import { useActionState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Printer, FileDown, AlertTriangle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchPrinterSettings } from "@/lib/services/data"
import { updatePrinterSettings } from "@/lib/actions/settings"
import { buildTestReceipt, encodeReceipt } from "@/lib/printer/escpos"
import { printBytes, detectCapabilities, printBluetoothHint } from "@/lib/printer/print-service"
import type { FormActionState } from "@/lib/actions/settings"

export function PrinterSettingsView() {
  const queryClient = useQueryClient()
  const [state, action, pending] = useActionState<FormActionState, FormData>(updatePrinterSettings, {
    error: null,
    success: false,
  })

  const { data: settings } = useQuery({ queryKey: ["printer-settings"], queryFn: fetchPrinterSettings })

  const [form, setForm] = useState({
    printer_name: "",
    connection_type: "serial",
    paper_width_mm: 58,
    bluetooth_address: "",
    charset: "cp437",
  })
  const [hydrated, setHydrated] = useState(false)
  if (settings && !hydrated) {
    setHydrated(true)
    setForm({
      printer_name: settings.printer_name ?? "",
      connection_type: settings.connection_type ?? "serial",
      paper_width_mm: settings.paper_width_mm ?? 58,
      bluetooth_address: settings.bluetooth_address ?? "",
      charset: settings.charset ?? "cp437",
    })
  }

  useEffect(() => {
    if (state.error) toast.error(state.error)
    if (state.success) {
      toast.success("Pengaturan printer disimpan.")
      queryClient.invalidateQueries({ queryKey: ["printer-settings"] })
    }
  }, [state, queryClient])

  const caps = detectCapabilities()

  const testPrint = async () => {
    const width = form.paper_width_mm >= 80 ? 42 : 32
    const bytes = encodeReceipt(buildTestReceipt(width))
    const res = await printBytes(bytes, "TES-PRINTER")
    if (res.ok) toast.success(res.message)
    else toast.error(res.message)
  }

  const downloadTest = () => {
    const width = form.paper_width_mm >= 80 ? 42 : 32
    const bytes = encodeReceipt(buildTestReceipt(width))
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tes-printer.bin"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("File tes printer diunduh.")
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Pengaturan Printer
          </CardTitle>
          <CardDescription>Printer thermal ESC/POS 58mm/80mm.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="printer_name">Nama Printer</Label>
                <Input
                  id="printer_name"
                  name="printer_name"
                  value={form.printer_name}
                  onChange={(e) => setForm({ ...form, printer_name: e.target.value })}
                  placeholder="Printer Kasir 58mm"
                />
              </div>
              <div className="space-y-2">
                <Label>Koneksi</Label>
                <input type="hidden" name="connection_type" value={form.connection_type} />
                <Select value={form.connection_type} onValueChange={(v) => setForm({ ...form, connection_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serial">USB / Serial</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paper_width_mm">Lebar Kertas (mm)</Label>
                <Input
                  id="paper_width_mm"
                  name="paper_width_mm"
                  type="number"
                  min={58}
                  max={80}
                  value={form.paper_width_mm}
                  onChange={(e) => setForm({ ...form, paper_width_mm: Number(e.target.value) || 58 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Charset</Label>
                <input type="hidden" name="charset" value={form.charset} />
                <Select value={form.charset} onValueChange={(v) => setForm({ ...form, charset: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cp437">CP437 (default)</SelectItem>
                    <SelectItem value="cp850">CP850</SelectItem>
                    <SelectItem value="cp1252">CP1252</SelectItem>
                    <SelectItem value="shift_jis">Shift-JIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.connection_type === "bluetooth" && (
              <div className="space-y-2">
                <Label htmlFor="bluetooth_address">Alamat Bluetooth (opsional)</Label>
                <Input
                  id="bluetooth_address"
                  name="bluetooth_address"
                  value={form.bluetooth_address}
                  onChange={(e) => setForm({ ...form, bluetooth_address: e.target.value })}
                  placeholder="00:11:22:33:44:55"
                />
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Browser web tidak bisa mengakses printer Bluetooth klasik (SPP). Untuk
                  mencetak via Bluetooth, simpan file .bin dan cetak lewat aplikasi vendor
                  printer di perangkat Anda.
                </p>
              </div>
            )}

            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tes Printer</CardTitle>
          <CardDescription>
            {caps.serial
              ? "Printer USB/Serial terdeteksi — cetak langsung."
              : "Tidak ada akses serial di browser ini. Unduh file tes dan cetak melalui aplikasi printer."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {caps.serial ? (
            <Button onClick={testPrint}>
              <Printer className="mr-2 h-4 w-4" />
              Cetak Uji
            </Button>
          ) : (
            <Button onClick={downloadTest}>
              <FileDown className="mr-2 h-4 w-4" />
              Unduh Tes .bin
            </Button>
          )}
          <Button variant="outline" onClick={() => toast.info(printBluetoothHint().message)}>
            Info Bluetooth
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
