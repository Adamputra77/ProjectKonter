-- ============================================================================
-- POS Kounter HP — Initial Schema
-- Tabel, constraint, index, trigger, dan RLS untuk aplikasi kasir
-- ============================================================================

-- Extensions
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ============================================================================
-- TABEL
-- ============================================================================

-- PROFILES (sinkron dengan auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'kasir' check (role in ('admin', 'kasir')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  kode_produk text not null unique,
  nama_produk text not null,
  kategori_id uuid references public.categories (id) on delete set null,
  harga_beli numeric(14,2) not null check (harga_beli >= 0),
  harga_jual numeric(14,2) not null check (harga_jual >= 0),
  stok integer not null default 0 check (stok >= 0),
  stok_minimum integer not null default 0 check (stok_minimum >= 0),
  satuan text not null default 'pcs',
  deskripsi text,
  gambar text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- STOCK MOVEMENTS (semua perubahan stok tercatat di sini)
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity <> 0),
  type text not null check (type in ('IN', 'OUT', 'ADJUSTMENT')),
  reference_type text check (reference_type in ('transaction', 'adjustment', 'initial', 'cancel')),
  reference_id text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  user_id uuid not null references auth.users (id),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null check (total >= 0),
  paid_amount numeric(14,2) not null check (paid_amount >= 0),
  change_amount numeric(14,2) not null default 0 check (change_amount >= 0),
  payment_method text not null check (payment_method in ('CASH', 'TRANSFER', 'QRIS', 'DEBIT', 'EWALLET')),
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id),
  cancel_reason text,
  created_at timestamptz not null default now()
);

-- TRANSACTION ITEMS (snapshot nama & harga agar histori aman)
create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  price numeric(14,2) not null check (price >= 0),
  cost_price numeric(14,2) not null check (cost_price >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0)
);

-- STORE SETTINGS (single row, id = 1)
create table public.store_settings (
  id integer primary key check (id = 1),
  store_name text not null default 'TOKO KONTER HP',
  address text not null default '',
  phone text not null default '',
  receipt_footer text not null default 'Barang yang sudah dibeli tidak dapat dikembalikan',
  logo_url text,
  updated_at timestamptz not null default now()
);

-- PRINTER SETTINGS (single row, id = 1)
create table public.printer_settings (
  id integer primary key check (id = 1),
  printer_name text not null default '',
  connection_type text not null default 'bluetooth' check (connection_type in ('bluetooth', 'usb', 'serial', 'network', 'native')),
  paper_width_mm integer not null default 58 check (paper_width_mm in (58, 80)),
  bluetooth_address text,
  charset text not null default 'escpos',
  updated_at timestamptz not null default now()
);

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEX
-- ============================================================================

create index idx_products_kode on public.products using gin (kode_produk gin_trgm_ops);
create index idx_products_nama on public.products using gin (nama_produk gin_trgm_ops);
create index idx_products_kategori on public.products (kategori_id);
create index idx_products_active on public.products (is_active) where is_active;

create index idx_movements_product on public.stock_movements (product_id, created_at desc);
create index idx_movements_reference on public.stock_movements (reference_id);

create index idx_transactions_created on public.transactions (created_at desc);
create index idx_transactions_user on public.transactions (user_id);
create index idx_transactions_invoice on public.transactions (invoice_number);
create index idx_transactions_status on public.transactions (status);

create index idx_items_transaction on public.transaction_items (transaction_id);
create index idx_items_product on public.transaction_items (product_id);

create index idx_audit_created on public.audit_logs (created_at desc);
create index idx_audit_entity on public.audit_logs (entity, entity_id);

-- ============================================================================
-- TRIGGER: profil otomatis saat user baru dibuat
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'kasir')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_store_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger set_printer_updated_at before update on public.printer_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — HELPER
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================================
-- RLS — POLICIES
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.printer_settings enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- CATEGORIES
create policy "categories_select_auth" on public.categories
  for select to authenticated using (true);
create policy "categories_admin_insert" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "categories_admin_update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- PRODUCTS
create policy "products_select_auth" on public.products
  for select to authenticated using (true);
create policy "products_admin_insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products_admin_update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products
  for delete to authenticated using (public.is_admin());

-- STOCK MOVEMENTS
create policy "movements_select" on public.stock_movements
  for select to authenticated using (public.is_admin() or created_by = auth.uid());
create policy "movements_admin_insert" on public.stock_movements
  for insert to authenticated with check (public.is_admin());

-- TRANSACTIONS
create policy "transactions_select" on public.transactions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "transactions_admin_update" on public.transactions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- TRANSACTION ITEMS (lewat relasi ke transaction)
create policy "items_select" on public.transaction_items
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

-- STORE SETTINGS
create policy "store_select_auth" on public.store_settings
  for select to authenticated using (true);
create policy "store_admin_update" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- PRINTER SETTINGS
create policy "printer_select_auth" on public.printer_settings
  for select to authenticated using (true);
create policy "printer_admin_update" on public.printer_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- AUDIT LOGS
create policy "audit_select_admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- DATA AWAL
-- ============================================================================

insert into public.store_settings (id) values (1)
  on conflict do nothing;

insert into public.printer_settings (id) values (1)
  on conflict do nothing;
