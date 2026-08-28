"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Package, Loader2, Store } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/format"
import { fetchProducts, fetchCategories } from "@/lib/services/data"
import { useCartStore } from "./cart-store"

export function ProductGrid() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, category ?? "all"],
    queryFn: () => fetchProducts(search, category ?? undefined, true),
  })

  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const qtyInCart = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of items) m.set(i.product_id, i.quantity)
    return m
  }, [items])

  // Synkronisasi harga/stok dengan database saat data dimuat
  useEffect(() => {
    if (products) useCartStore.getState().setProducts(products)
  }, [products])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama / kode produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9 text-base"
        />
      </div>

      <ScrollArea className="shrink-0">
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              category === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted"
            )}
          >
            Semua
          </button>
          {(categories ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(category === c.id ? null : c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </ScrollArea>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Produk tidak ditemukan</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Ubah kata kunci pencarian." : "Tidak ada produk di kategori ini."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {(products ?? []).map((p) => {
              const inCart = qtyInCart.get(p.id) ?? 0
              const outOfStock = p.stok <= 0
              const maxed = inCart >= p.stok
              return (
                <button
                  key={p.id}
                  disabled={outOfStock || maxed}
                  onClick={() => addItem(p)}
                  className={cn(
                    "group relative flex flex-col rounded-xl border bg-card p-3 text-left shadow-sm transition-all",
                    "hover:border-primary/50 hover:shadow-md active:scale-[0.98]",
                    (outOfStock || maxed) && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <p className="line-clamp-2 min-h-8 text-sm font-medium leading-4">{p.nama_produk}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{p.kode_produk}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{formatCurrency(p.harga_jual)}</p>
                    <span
                      className={cn(
                        "text-[10px]",
                        p.stok <= p.stok_minimum ? "font-medium text-destructive" : "text-muted-foreground"
                      )}
                    >
                      Sisa {p.stok}
                    </span>
                  </div>
                  {inCart > 0 && (
                    <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                      {inCart}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat produk...
        </div>
      )}
    </div>
  )
}