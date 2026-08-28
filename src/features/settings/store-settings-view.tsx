"use client"

import { useEffect, useState } from "react"
import { useActionState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Store } from "lucide-react"
import { fetchStoreSettings } from "@/lib/services/data"
import { updateStoreSettings } from "@/lib/actions/settings"
import type { FormActionState } from "@/lib/actions/settings"

export function StoreSettingsView() {
  const queryClient = useQueryClient()
  const [state, action, pending] = useActionState<FormActionState, FormData>(updateStoreSettings, {
    error: null,
    success: false,
  })

  const { data: settings } = useQuery({ queryKey: ["store-settings"], queryFn: fetchStoreSettings })

  const [form, setForm] = useState({ store_name: "", address: "", phone: "", receipt_footer: "" })
  const [hydrated, setHydrated] = useState(false)
  if (settings && !hydrated) {
    setHydrated(true)
    setForm({
      store_name: settings.store_name,
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      receipt_footer: settings.receipt_footer ?? "",
    })
  }

  useEffect(() => {
    if (state.error) toast.error(state.error)
    if (state.success) {
      toast.success("Pengaturan toko disimpan.")
      queryClient.invalidateQueries({ queryKey: ["store-settings"] })
    }
  }, [state, queryClient])

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Pengaturan Toko
        </CardTitle>
        <CardDescription>Informasi toko yang tampil di bagian atas struk.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store_name">Nama Toko</Label>
            <Input
              id="store_name"
              name="store_name"
              value={form.store_name}
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
              placeholder="KONTER HP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Jl. Merdeka No. 1, Jakarta"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telepon</Label>
            <Input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0812-3456-7890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receipt_footer">Footer Struk</Label>
            <Textarea
              id="receipt_footer"
              name="receipt_footer"
              rows={3}
              value={form.receipt_footer}
              onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
              placeholder="Satu baris per baris"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
