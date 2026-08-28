"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Search, Plus, Pencil, Power, Package, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { fetchProducts, fetchCategories } from "@/lib/services/data"
import { toggleProductActive } from "@/lib/actions/products"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { ProductFormDialog } from "./product-form"
import type { Product } from "@/types"
import { cn } from "@/lib/utils"

export function ProductsView({ role }: { role: "admin" | "kasir" }) {
  const isAdmin = role === "admin"
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [kategori, setKategori] = useState("all")
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Product | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["products", debounced, kategori],
    queryFn: () => fetchProducts(debounced, kategori),
  })

  const onToggle = useCallback(
    async (p: Product) => {
      setToggling(p.id)
      const res = await toggleProductActive(p.id, !p.is_active)
      setToggling(null)
      setConfirmToggle(null)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(p.is_active ? "Produk dinonaktifkan." : "Produk diaktifkan.")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    [queryClient]
  )

  const rows = useMemo(() => products ?? [], [products])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground">Kelola produk toko Anda</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama / kode produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={kategori} onValueChange={setKategori}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm">
        {isError ? (
          <p className="p-8 text-center text-sm text-destructive">Gagal memuat data produk.</p>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Tidak ada produk</p>
            <p className="text-xs text-muted-foreground">
              {debounced || kategori !== "all" ? "Ubah kata kunci pencarian." : "Tambahkan produk pertama Anda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.kode_produk}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="line-clamp-1">{p.nama_produk}</span>
                        {!p.is_active && <Badge variant="secondary">nonaktif</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.categories?.name ?? "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(p.harga_beli)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(p.harga_jual)}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-semibold",
                          p.stok <= p.stok_minimum ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {formatNumber(p.stok)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => { setEditing(p); setShowForm(true) }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={p.is_active ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => setConfirmToggle(p)}
                            disabled={toggling === p.id}
                          >
                            {toggling === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className={cn("h-4 w-4", p.is_active ? "text-destructive" : "text-emerald-600")} />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ProductFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        product={editing}
        categories={categories ?? []}
      />

      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => !o && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.is_active ? "Nonaktifkan produk?" : "Aktifkan produk?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.is_active
                ? `"${confirmToggle?.nama_produk}" tidak akan muncul di halaman kasir, tetapi riwayat transaksi tetap aman.`
                : `"${confirmToggle?.nama_produk}" akan muncul kembali di halaman kasir.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmToggle && onToggle(confirmToggle)}>
              {confirmToggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}