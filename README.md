# Konter POS — Sistem Kasir Toko HP

Sistem Kasir (POS) untuk toko/kounter HP: kasir, manajemen produk & kategori,
stok, transaksi, laporan profit/omzet, dan cetak struk thermal (ESC/POS 58mm/80mm).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Supabase** (PostgreSQL + RLS + RPC) — lokal lewat Docker
- Tailwind CSS v4 + shadcn/ui (radix) + lucide-react
- Zustand (keranjang), TanStack Query, React Hook Form + Zod v4
- Recharts (grafik dashboard), Sonner (toast)
- Serwist (PWA offline), Vitest + Testing Library (unit test)

## Menjalankan

Persyaratan: Node ≥ 20, Docker.

```bash
# 1. Infrastruktur database lokal
npx supabase start

# 2. Salin konfigurasi (URL + anon key dari output `npx supabase status`)
cp .env.example .env.local   # lalu isi NEXT_PUBLIC_SUPABASE_URL / ANON_KEY

# 3. Aplikasi
npm install
npm run dev          # http://localhost:3000
```

### Reset database (migrasi + seed)

```bash
npx supabase db reset
```

Akun demo (dari seed):

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@konter.test` | `admin123` |
| Kasir | `kasir@konter.test` | `kasir123` |

## Script

```bash
npm run dev          # dev server
npm run build        # production build (termasuk service worker PWA)
npm start            # jalankan build
npm run lint         # ESLint
npm test             # Vitest (unit test)
npx tsc --noEmit     # typecheck
```

## Struktur

```
src/
  app/               # Halaman & routes (login, dashboard, kasir, produk, stok, transaksi, laporan, printer, pengaturan)
  components/        # Komponen bersama (layout, printer receipt preview, ui/*)
  features/          # Fitur per-modul (cashier, dashboard, products, inventory, transactions, reports, settings, printer)
  lib/
    actions/         # Server actions (auth, products, transactions, settings)
    printer/         # Encoder ESC/POS murni + service transport (serial/file)
    services/        # Query data Supabase (client-side)
    supabase/        # Client/server/admin (service role)
    utils/           # formatCurrency, perhitungan uang murni
  proxy.ts           # Proteksi route + refresh sesi (Next 16: pengganti middleware)
supabase/
  migrations/        # Schema, RPC (transaksi atomik), grants
  seed.sql           # Data demo
```

## Model Data (ringkas)

- `profiles` — pengguna (role: admin/kasir)
- `categories`, `products` — katalog (produk di-nonaktifkan, tidak dihapus)
- `stock_movements` — jejak IN/OUT/ADJUSTMENT
- `transactions` + `transaction_items` — penjualan (soft-cancel, stok dikembalikan)
- `store_settings`, `printer_settings` — pengaturan toko & printer
- `audit_logs` — jejak aksi admin

Semua transaksi penjualan dibuat atomik lewat RPC `create_transaction`
(validasi stok, pengurangan stok, pencatatan movement, dan invoice `TRX-<tanggal>-<seq>`
dalam satu transaksi database). Pembatalan lewat `cancel_transaction` mengembalikan stok.

## RLS & Keamanan

- RLS aktif di semua tabel; akses tulis lewat RPC `SECURITY DEFINER` yang memvalidasi role.
- Server actions memakai **service role** hanya di sisi server (`src/lib/supabase/admin.ts`)
  dan memeriksa role admin — anon key publik tidak pernah punya akses tulis.
- Kunci di `.env.local` (gitignored); lihat `.env.example` untuk template.

## Printer Struk

- Encoder ESC/POS murni (`src/lib/printer/escpos.ts`) — tanpa DOM, teruji unit.
- Transport jujur: **Web Serial** (USB, Chrome desktop) atau **simpan file `.bin`**
  untuk dicetak lewat aplikasi vendor printer.
- Web Bluetooth TIDAK mendukung printer thermal klasik (SPP) — tidak ada dukungan palsu;
  aplikasi menyarankan jalur `.bin` / aplikasi pendamping.
- Tes printer tersedia di halaman **Printer** (menu Pengaturan).

## Tes

```bash
npm test
```

Mencakup: perhitungan uang (`money`), encoder ESC/POS + builder struk (`escpos`, `receipt`),
dan state keranjang (`cart-store`) — termasuk batas stok & sync stok pasca-transaksi.