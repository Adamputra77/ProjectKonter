"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Tags, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { fetchCategories } from "@/lib/services/data"
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type FormActionState,
} from "@/lib/actions/products"
import type { Category } from "@/types"

const initial: FormActionState = { error: null }

export function CategoriesView({ role }: { role: "admin" | "kasir" }) {
  const isAdmin = role === "admin"
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  const action = editing
    ? (prev: FormActionState, fd: FormData) => updateCategory(editing.id, prev, fd)
    : createCategory

  const [pending, setPending] = useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const res = await action(initial, new FormData(e.currentTarget))
    if (res.error) toast.error(res.error)
    else {
      toast.success(res.success)
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    }
  }

  const onDelete = async () => {
    if (!deleting) return
    const res = await deleteCategory(deleting.id)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Kategori dihapus.")
    queryClient.invalidateQueries({ queryKey: ["categories"] })
    queryClient.invalidateQueries({ queryKey: ["products"] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
          <p className="text-sm text-muted-foreground">Kelompokkan produk agar mudah dicari</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kategori
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (categories ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Tags className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Belum ada kategori</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(categories ?? []).map((c) => (
            <Card key={c.id} className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                {c.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    onClick={() => { setEditing(c); setShowForm(true) }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    title="Hapus"
                    onClick={() => setDeleting(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
            <DialogDescription>Nama kategori unik, contoh: Smartphone, Charger.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                placeholder="Contoh: HP dan smartphone"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={pending || undefined} onClick={() => setPending(true)}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk dalam kategori ini akan kehilangan kategorinya, tetapi data transaksi tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}