-- ============================================================================
-- POS Kounter HP — RPC Functions
-- create_transaction (atomic), cancel_transaction, adjust_stock,
-- next_invoice_number, dashboard_summary, sales_chart, top_products,
-- low_stock, report_summary, product_report
-- ============================================================================

-- ----------------------------------------------------------------------------
-- next_invoice_number: TRX-YYYYMMDD-0001 (race-safe dengan advisory lock)
-- ----------------------------------------------------------------------------
create or replace function public.next_invoice_number(p_date timestamptz default now())
returns text
language plpgsql
volatile
as $$
declare
  v_date text := to_char(p_date, 'YYYYMMDD');
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('konter_invoice_' || v_date));
  select count(*) + 1 into v_count
  from public.transactions
  where created_at >= date_trunc('day', p_date)
    and created_at < date_trunc('day', p_date) + interval '1 day';
  return 'TRX-' || v_date || '-' || lpad(v_count::text, 4, '0');
end;
$$;

-- ----------------------------------------------------------------------------
-- create_transaction(payload jsonb) — ATOMIC
-- Semua langkah (validasi stok, transaksi, items, pengurangan stok,
-- stock movement, invoice) dijalankan dalam SATU transaksi database.
-- Race condition dicegah dengan UPDATE ... WHERE stok >= qty.
-- ----------------------------------------------------------------------------
create or replace function public.create_transaction(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_items jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  v_payment text := upper(payload ->> 'payment_method');
  v_discount numeric(14,2) := coalesce((payload ->> 'discount')::numeric, 0);
  v_paid numeric(14,2) := (payload ->> 'paid_amount')::numeric;
  v_user uuid;
  v_subtotal numeric(14,2) := 0;
  v_total numeric(14,2);
  v_change numeric(14,2);
  v_invoice text;
  v_tx_id uuid;
  v_item jsonb;
  v_product record;
  v_updated integer;
  v_notes text := payload ->> 'notes';
  v_created_at timestamptz := now();
begin
  -- Otorisasi: harus login. Saat dipanggil dari seeder (uid null),
  -- user_id boleh ditentukan payload.
  if auth.uid() is not null then
    v_user := auth.uid();
  else
    v_user := (payload ->> 'user_id')::uuid;
    -- Hanya seeder/service yang boleh menulis tanggal lampau
    v_created_at := coalesce((payload ->> 'created_at')::timestamptz, now());
  end if;

  if v_user is null then
    raise exception 'Tidak ada user untuk transaksi';
  end if;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  if v_discount < 0 then
    raise exception 'Diskon tidak valid';
  end if;

  if v_payment not in ('CASH', 'TRANSFER', 'QRIS', 'DEBIT', 'EWALLET') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  -- Loop item: cek stok dengan lock, kurangi stok, hitung subtotal dari DB
  for v_item in select * from jsonb_array_elements(v_items) loop
    select id, nama_produk, harga_jual, harga_beli
      into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid
        and is_active
      for update;

    if not found then
      raise exception 'Produk tidak ditemukan atau tidak aktif';
    end if;

    if (v_item ->> 'quantity')::integer <= 0 then
      raise exception 'Quantity tidak valid';
    end if;

    -- Atomic stock deduction: hanya sukses jika stok mencukupi
    update public.products
       set stok = stok - (v_item ->> 'quantity')::integer
     where id = v_product.id
       and stok >= (v_item ->> 'quantity')::integer;

    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'Stok % tidak mencukupi. Stok tersedia: %.', v_product.nama_produk, v_product.stok;
    end if;

    v_subtotal := v_subtotal + v_product.harga_jual * (v_item ->> 'quantity')::integer;
  end loop;

  if v_discount > v_subtotal then
    raise exception 'Diskon melebihi subtotal';
  end if;

  v_total := v_subtotal - v_discount;
  if v_paid < v_total then
    raise exception 'Jumlah pembayaran kurang Rp%.', to_char(v_total - v_paid, 'FM999G999G999G999');
  end if;

  v_change := v_paid - v_total;
  v_invoice := public.next_invoice_number(v_created_at);

  -- Insert transaction
  insert into public.transactions (
    invoice_number, user_id, subtotal, discount, total,
    paid_amount, change_amount, payment_method, status, created_at
  ) values (
    v_invoice, v_user, v_subtotal, v_discount, v_total,
    v_paid, v_change, v_payment, 'completed', v_created_at
  ) returning id into v_tx_id;

  -- Insert items + stock movements
  for v_item in select * from jsonb_array_elements(v_items) loop
    select id, nama_produk, harga_jual, harga_beli
      into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid;

    insert into public.transaction_items (
      transaction_id, product_id, product_name_snapshot, quantity,
      price, cost_price, subtotal
    ) values (
      v_tx_id, v_product.id, v_product.nama_produk,
      (v_item ->> 'quantity')::integer,
      v_product.harga_jual, v_product.harga_beli,
      v_product.harga_jual * (v_item ->> 'quantity')::integer
    );

    insert into public.stock_movements (
      product_id, quantity, type, reference_type, reference_id, notes, created_by
    ) values (
      v_product.id, -((v_item ->> 'quantity')::integer), 'OUT',
      'transaction', v_invoice, v_notes, v_user
    );
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, details)
  values (v_user, 'create_transaction', 'transaction', v_invoice,
          jsonb_build_object('total', v_total, 'items', jsonb_array_length(v_items)));

  return jsonb_build_object(
    'invoice_number', v_invoice,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_total,
    'paid_amount', v_paid,
    'change_amount', v_change,
    'payment_method', v_payment,
    'user_id', v_user,
    'created_at', v_created_at
  );
end;
$$;

revoke execute on function public.create_transaction(jsonb) from public, anon;
grant execute on function public.create_transaction(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- cancel_transaction — admin, stok dikembalikan, status cancelled (soft)
-- ----------------------------------------------------------------------------
create or replace function public.cancel_transaction(
  p_transaction_id uuid,
  p_reason text default 'Dibatalkan oleh admin'
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tx record;
  v_item record;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat membatalkan transaksi';
  end if;

  select id, invoice_number, status into v_tx
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaksi tidak ditemukan';
  end if;

  if v_tx.status <> 'completed' then
    raise exception 'Transaksi sudah dibatalkan';
  end if;

  update public.transactions
     set status = 'cancelled', cancelled_at = now(),
         cancelled_by = auth.uid(), cancel_reason = p_reason
   where id = p_transaction_id;

  -- Kembalikan stok + buat movement IN
  for v_item in
    select * from public.transaction_items where transaction_id = p_transaction_id
  loop
    update public.products
       set stok = stok + v_item.quantity
     where id = v_item.product_id;

    insert into public.stock_movements (
      product_id, quantity, type, reference_type, reference_id, notes, created_by
    ) values (
      v_item.product_id, v_item.quantity, 'IN',
      'cancel', v_tx.invoice_number, p_reason, auth.uid()
    );
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, details)
  values (auth.uid(), 'cancel_transaction', 'transaction', v_tx.invoice_number,
          jsonb_build_object('reason', p_reason));
end;
$$;

revoke execute on function public.cancel_transaction(uuid, text) from public, anon;
grant execute on function public.cancel_transaction(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- adjust_stock — penyesuaian stok manual oleh admin, dengan history
-- ----------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_new_stock integer,
  p_notes text default ''
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_delta integer;
  v_product text;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menyesuaikan stok';
  end if;

  if p_new_stock < 0 then
    raise exception 'Stok tidak boleh negatif';
  end if;

  select stok, nama_produk into v_current, v_product
  from public.products where id = p_product_id for update;

  if not found then
    raise exception 'Produk tidak ditemukan';
  end if;

  v_delta := p_new_stock - v_current;

  if v_delta = 0 then
    return;
  end if;

  update public.products set stok = p_new_stock where id = p_product_id;

  insert into public.stock_movements (
    product_id, quantity, type, reference_type, reference_id, notes, created_by
  ) values (
    p_product_id, v_delta, 'ADJUSTMENT', 'adjustment', p_product_id::text,
    coalesce(nullif(p_notes, ''), 'Penyesuaian stok'), auth.uid()
  );

  insert into public.audit_logs (user_id, action, entity, entity_id, details)
  values (auth.uid(), 'adjust_stock', 'product', p_product_id::text,
          jsonb_build_object('product', v_product, 'delta', v_delta));
end;
$$;

revoke execute on function public.adjust_stock(uuid, integer, text) from public, anon;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;

-- ----------------------------------------------------------------------------
-- dashboard_summary — angka real untuk dashboard
-- ----------------------------------------------------------------------------
create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'today', (
      select jsonb_build_object(
        'omzet', coalesce(sum(total), 0),
        'profit', coalesce(sum(profit), 0),
        'transaction_count', count(distinct x.id),
        'items_sold', coalesce(sum(qty), 0)
      )
      from (
        select t.id, t.total,
               sum((ti.price - ti.cost_price) * ti.quantity) as profit,
               sum(ti.quantity) as qty
        from transactions t
        join transaction_items ti on ti.transaction_id = t.id
        where t.status = 'completed'
          and t.created_at >= date_trunc('day', now())
        group by t.id
      ) x
    ),
    'month', (
      select jsonb_build_object(
        'omzet', coalesce(sum(total), 0),
        'profit', coalesce(sum(profit), 0),
        'transaction_count', count(distinct x.id),
        'items_sold', coalesce(sum(qty), 0)
      )
      from (
        select t.id, t.total,
               sum((ti.price - ti.cost_price) * ti.quantity) as profit,
               sum(ti.quantity) as qty
        from transactions t
        join transaction_items ti on ti.transaction_id = t.id
        where t.status = 'completed'
          and t.created_at >= date_trunc('month', now())
        group by t.id
      ) x
    ),
    'totals', (
      select jsonb_build_object(
        'total_products', count(*) filter (where is_active),
        'total_stock', coalesce(sum(stok), 0),
        'low_stock', count(*) filter (where is_active and stok <= stok_minimum)
      )
      from products
    )
  );
$$;

revoke execute on function public.dashboard_summary() from public, anon;
grant execute on function public.dashboard_summary() to authenticated;

-- ----------------------------------------------------------------------------
-- sales_chart(start, end) — omzet/profit per hari untuk grafik
-- ----------------------------------------------------------------------------
create or replace function public.sales_chart(p_start date, p_end date)
returns table (tanggal date, omzet numeric, profit numeric, transaksi bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.created_at::date as tanggal,
    sum(t.total)::numeric(14,2) as omzet,
    sum((ti.price - ti.cost_price) * ti.quantity)::numeric(14,2) as profit,
    count(distinct t.id)::bigint as transaksi
  from transactions t
  join transaction_items ti on ti.transaction_id = t.id
  where t.status = 'completed'
    and t.created_at >= p_start::timestamp
    and t.created_at < (p_end + 1)::timestamp
  group by t.created_at::date
  order by tanggal;
$$;

revoke execute on function public.sales_chart(date, date) from public, anon;
grant execute on function public.sales_chart(date, date) to authenticated;

-- ----------------------------------------------------------------------------
-- top_products — produk terlaris
-- ----------------------------------------------------------------------------
create or replace function public.top_products(p_limit integer default 10)
returns table (product_id uuid, nama text, qty bigint, revenue numeric, profit numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    ti.product_id,
    max(ti.product_name_snapshot) as nama,
    sum(ti.quantity)::bigint as qty,
    sum(ti.subtotal)::numeric(14,2) as revenue,
    sum((ti.price - ti.cost_price) * ti.quantity)::numeric(14,2) as profit
  from transaction_items ti
  join transactions t on t.id = ti.transaction_id
  where t.status = 'completed'
  group by ti.product_id
  order by qty desc
  limit p_limit;
$$;

revoke execute on function public.top_products(integer) from public, anon;
grant execute on function public.top_products(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- low_stock — produk dengan stok menipis (stok <= stok_minimum)
-- ----------------------------------------------------------------------------
create or replace function public.low_stock()
returns table (
  id uuid, kode_produk text, nama_produk text, stok integer,
  stok_minimum integer, satuan text, kategori text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.kode_produk, p.nama_produk, p.stok, p.stok_minimum,
         p.satuan, c.name as kategori
  from products p
  left join categories c on c.id = p.kategori_id
  where p.is_active and p.stok <= p.stok_minimum
  order by p.stok asc;
$$;

revoke execute on function public.low_stock() from public, anon;
grant execute on function public.low_stock() to authenticated;

-- ----------------------------------------------------------------------------
-- report_summary(start, end) — ringkasan laporan
-- ----------------------------------------------------------------------------
create or replace function public.report_summary(p_start date, p_end date)
returns table (
  omzet numeric, modal numeric, profit numeric,
  transaksi bigint, items_terjual bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(t.total), 0)::numeric(14,2) as omzet,
    coalesce(sum(ti.cost_price * ti.quantity), 0)::numeric(14,2) as modal,
    coalesce(sum((ti.price - ti.cost_price) * ti.quantity), 0)::numeric(14,2) as profit,
    count(distinct t.id)::bigint as transaksi,
    coalesce(sum(ti.quantity), 0)::bigint as items_terjual
  from transactions t
  left join transaction_items ti on ti.transaction_id = t.id
  where t.status = 'completed'
    and t.created_at >= p_start::timestamp
    and t.created_at < (p_end + 1)::timestamp;
$$;

revoke execute on function public.report_summary(date, date) from public, anon;
grant execute on function public.report_summary(date, date) to authenticated;

-- ----------------------------------------------------------------------------
-- product_report(start, end) — laporan per produk
-- ----------------------------------------------------------------------------
create or replace function public.product_report(p_start date, p_end date)
returns table (
  product_id uuid, nama text, qty bigint, revenue numeric, profit numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ti.product_id,
    max(ti.product_name_snapshot) as nama,
    sum(ti.quantity)::bigint as qty,
    sum(ti.subtotal)::numeric(14,2) as revenue,
    sum((ti.price - ti.cost_price) * ti.quantity)::numeric(14,2) as profit
  from transaction_items ti
  join transactions t on t.id = ti.transaction_id
  where t.status = 'completed'
    and t.created_at >= p_start::timestamp
    and t.created_at < (p_end + 1)::timestamp
  group by ti.product_id
  order by qty desc;
$$;

revoke execute on function public.product_report(date, date) from public, anon;
grant execute on function public.product_report(date, date) to authenticated;
