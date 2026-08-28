"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Boxes, SlidersHorizontal, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchProducts, fetchStockMovements } from "@/lib/services/data"
import { adjustStock } from "@/lib/actions/products"
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"

export function InventoryView({ role }: { role: "admin" | "kasir" }) {
  const isAdmin = role === "admin"
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [newStock, setNewStock] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [movementFilter, setMovementFilter] = useState("all")

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", search, "all"],
    queryFn: () => fetchProducts(search, undefined),
  })

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", movementFilter],
    queryFn: () => fetchStockMovements(100),
  })

  const onAdjust = async () => {
    if (!adjusting) return
    const stock = Number(newStock)
    if (!Number.isInteger(stock) || stock < 0) {
      toast.error("Stok harus angka bulat dan tidak negatif.")
      return
    }
    setSaving(true)
    const res = await adjustStock(adjusting.id, stock, notes.trim())
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Stok disesuaikan.")
    setAdjusting(null)
    setNewStock("")
    setNotes("")
    queryClient.invalidateQueries({ queryKey: ["products"] })
    queryClient.invalidateQueries({ queryKey: ["stock-movements"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["low-stock"] })
  }

  const filteredMovements = (movements ?? []).filter(
    (m) => movementFilter === "all" || m.type === movementFilter
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stok &amp; Inventori</h1>
          <p className="text-sm text-muted-foreground">Pantau stok dan riwayat pergerakan barang</p>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stok Produk</TabsTrigger>
          <TabsTrigger value="history">Riwayat Stok</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card className="shadow-sm">
            {productsLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (products ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Boxes className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Tidak ada produk</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-right">Minimum</TableHead>
                      <TableHead className="text-right">Nilai Stok (beli)</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products ?? []).map((p) => {
                      const low = p.stok <= p.stok_minimum
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="line-clamp-1 font-medium">{p.nama_produk}</span>
                              {!p.is_active && <Badge variant="secondary">nonaktif</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{p.kode_produk}</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={cn(low && "text-destructive")}>
                              {formatNumber(p.stok)} {p.satuan}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatNumber(p.stok_minimum)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(p.harga_beli * p.stok)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={low ? "destructive" : "default"}>
                              {low ? "Stok Menipis" : "Aman"}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAdjusting(p)
                                  setNewStock(String(p.stok))
                                  setNotes("")
                                }}
                              >
                                <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                                Sesuaikan
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Select value={movementFilter} onValueChange={setMovementFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                <SelectItem value="IN">Stok Masuk (IN)</SelectItem>
                <SelectItem value="OUT">Stok Keluar (OUT)</SelectItem>
                <SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Menampilkan 100 riwayat terbaru</p>
          </div>

          <Card className="shadow-sm">
            {movementsLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredMovements.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">Belum ada riwayat stok.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center">Tipe</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(m.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {m.products?.nama_produk ?? "Produk dihapus"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              m.type === "IN" && "border-emerald-300 text-emerald-700",
                              m.type === "OUT" && "border-red-300 text-red-600",
                              m.type === "ADJUSTMENT" && "border-amber-300 text-amber-700"
                            )}
                          >
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            m.quantity > 0 ? "text-emerald-600" : "text-red-600"
                          )}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {m.reference_id ?? "-"}
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                          {m.notes ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan Stok</DialogTitle>
            <DialogDescription>
              {adjusting?.nama_produk} · stok saat ini {formatNumber(adjusting?.stok ?? 0)}{" "}
              {adjusting?.satuan}. Perubahan akan tercatat di riwayat stok.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-stock">Stok baru</Label>
              <Input
                id="new-stock"
                type="number"
                min={0}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Input
                id="notes"
                placeholder="Contoh: barang masuk dari supplier"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjusting(null)}>
                Batal
              </Button>
              <Button onClick={onAdjust} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}