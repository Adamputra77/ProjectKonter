"use client"

import { useActionState, useEffect } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2 } from "lucide-react"
import { createProduct, updateProduct, type FormActionState } from "@/lib/actions/products"
import { productSchema, type ProductFormValues } from "@/lib/validations"
import type { Category, Product } from "@/types"

const initial: FormActionState = { error: null }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  categories: Category[]
}

export function ProductFormDialog({ open, onOpenChange, product, categories }: Props) {
  const queryClient = useQueryClient()

  const form = useForm<ProductFormValues>({
    // zod v4: field default di schema membuat input type berbeda dari output;
    // nilai sudah divalidasi penuh oleh resolver dan server action.
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      kode_produk: "",
      nama_produk: "",
      kategori_id: "",
      harga_beli: 0,
      harga_jual: 0,
      stok: 0,
      stok_minimum: 0,
      satuan: "pcs",
      deskripsi: "",
      is_active: true,
    },
  })

  // Isi form saat dialog dibuka dengan data produk yang diedit
  useEffect(() => {
    if (open) {
      form.reset(
        product
          ? {
              kode_produk: product.kode_produk,
              nama_produk: product.nama_produk,
              kategori_id: product.kategori_id ?? "",
              harga_beli: Number(product.harga_beli),
              harga_jual: Number(product.harga_jual),
              stok: product.stok,
              stok_minimum: product.stok_minimum,
              satuan: product.satuan,
              deskripsi: product.deskripsi ?? "",
              is_active: product.is_active,
            }
          : {
              kode_produk: "",
              nama_produk: "",
              kategori_id: categories[0]?.id ?? "",
              harga_beli: 0,
              harga_jual: 0,
              stok: 0,
              stok_minimum: 0,
              satuan: "pcs",
              deskripsi: "",
              is_active: true,
            }
      )
    }
  }, [open, product, categories, form])

  const action = product
    ? (prev: FormActionState, fd: FormData) => updateProduct(product.id, prev, fd)
    : createProduct

  const [state, formAction, pending] = useActionState(action, initial)

  useEffect(() => {
    if (state.error) toast.error(state.error)
    else if (state.success) {
      toast.success(state.success)
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["low-stock"] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            Stok dan harga memengaruhi perhitungan omzet serta profit toko.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="kode_produk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Produk</FormLabel>
                    <FormControl>
                      <Input placeholder="HP-0009" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nama_produk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <FormControl>
                      <Input placeholder="Samsung Galaxy A55" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="kategori_id"
              render={({ field }) => (
                <FormItem>
                  <input type="hidden" name="kategori_id" value={field.value} />
                  <FormLabel>Kategori</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="harga_beli"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="7000000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="harga_jual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Jual (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="8000000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="stok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stok_minimum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Minimum</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="satuan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan</FormLabel>
                    <FormControl>
                      <Input placeholder="pcs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deskripsi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Pilihan... (opsional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? "Simpan Perubahan" : "Tambah Produk"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}