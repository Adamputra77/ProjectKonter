"use client"

import { useState } from "react"
import { ShoppingCart } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ProductGrid } from "./product-grid"
import { CartPanel } from "./cart-panel"
import { useCartStore } from "./cart-store"
import { useWakeLock } from "@/lib/hooks/use-wake-lock"
import { cn } from "@/lib/utils"

export function CashierView() {
  const [cartOpen, setCartOpen] = useState(false)
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  useWakeLock()

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-0 flex-col gap-0 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:gap-4">
      <h1 className="mb-2 shrink-0 text-xl font-bold tracking-tight lg:hidden">Kasir</h1>

      {/* Kolom kiri: produk (desktop) */}
      <div className="hidden flex-1 lg:block">
        <ProductGrid />
      </div>

      {/* Kolom kanan: keranjang (desktop) */}
      <div className="hidden w-[380px] shrink-0 xl:block">
        <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Keranjang</p>
            {itemCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {itemCount} item
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <CartPanel />
          </div>
        </div>
      </div>

      {/* Mobile / tablet: grid produk + floating button + sheet */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <ProductGrid />
      </div>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg lg:hidden"
            aria-label="Buka keranjang"
          >
            <ShoppingCart className="h-5 w-5" />
            <span
              className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs"
              )}
            >
              {itemCount}
            </span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Keranjang</p>
            {itemCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {itemCount} item
              </span>
            )}
          </div>
          <div className="h-[calc(100dvh-4rem)]">
            <CartPanel />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}