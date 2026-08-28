-- ============================================================================
-- POS Kounter HP — SEED DATA (development only)
-- Kategori, produk, user demo, transaksi dummy
-- ============================================================================

-- pgcrypto (crypt/gen_salt) — wajib aktif untuk hash password demo
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- USER DEMO (password di-hash dengan pgcrypto)
--   admin  : admin@konter.test / admin123  -> role admin
--   kasir  : kasir@konter.test / kasir123  -> role kasir
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from auth.users where email = 'admin@konter.test') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      'authenticated', 'authenticated', 'admin@konter.test',
      crypt('admin123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrator","role":"admin"}',
      now(), now(), '', '', '', ''
    );
  end if;

  if not exists (select 1 from auth.users where email = 'kasir@konter.test') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000002',
      'authenticated', 'authenticated', 'kasir@konter.test',
      crypt('kasir123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"full_name":"Kasir Demo","role":"kasir"}',
      now(), now(), '', '', '', ''
    );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from auth.identities where provider_id = '00000000-0000-0000-0000-000000000001') then
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@konter.test"}'::jsonb,
      'email', now(), now(), now()
    );
  end if;

  if not exists (select 1 from auth.identities where provider_id = '00000000-0000-0000-0000-000000000002') then
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000002',
      '{"sub":"00000000-0000-0000-0000-000000000002","email":"kasir@konter.test"}'::jsonb,
      'email', now(), now(), now()
    );
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- KATEGORI
-- ----------------------------------------------------------------------------
insert into public.categories (name, description) values
  ('Smartphone',      'Handphone dan smartphone'),
  ('Charger',         'Charger HP berbagai tipe'),
  ('Kabel',           'Kabel data dan kabel charger'),
  ('Casing',          'Casing dan pelindung HP'),
  ('Tempered Glass',  'Pelindung layar'),
  ('Headset',         'Headset dan earbuds'),
  ('Powerbank',       'Powerbank portable'),
  ('Aksesoris',       'Aksesoris lainnya'),
  ('Pulsa',           'Pulsa dan paket data'),
  ('Lainnya',         'Produk lainnya')
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- PRODUK (16 produk: 8 HP + 8 aksesoris)
-- ----------------------------------------------------------------------------
insert into public.products (
  kode_produk, nama_produk, kategori_id, harga_beli, harga_jual,
  stok, stok_minimum, satuan, deskripsi
)
select
  data.kode_produk, data.nama_produk, c.id, data.harga_beli, data.harga_jual,
  data.stok, data.stok_minimum, data.satuan, data.deskripsi
from (values
  ('HP-0001', 'iPhone 13',             'Smartphone',     7000000, 8000000, 18, 2, 'pcs', '128GB, kondisi baru garansi resmi'),
  ('HP-0002', 'Samsung Galaxy A15',    'Smartphone',     2200000, 2700000, 25, 2, 'pcs', '8/128GB, garansi resmi'),
  ('HP-0003', 'Samsung Galaxy A25',    'Smartphone',     2500000, 3100000, 20, 2, 'pcs', '8/256GB, garansi resmi'),
  ('HP-0004', 'Redmi Note 13',         'Smartphone',     2400000, 2900000, 22, 2, 'pcs', '8/256GB, garansi resmi'),
  ('HP-0005', 'POCO X6',               'Smartphone',     2600000, 3200000, 18, 2, 'pcs', '8/256GB, garansi resmi'),
  ('HP-0006', 'OPPO A58',              'Smartphone',     1800000, 2300000, 25, 2, 'pcs', '6/128GB, garansi resmi'),
  ('HP-0007', 'Vivo Y27',              'Smartphone',     1700000, 2200000, 22, 2, 'pcs', '6/128GB, garansi resmi'),
  ('HP-0008', 'Realme C55',            'Smartphone',     1600000, 2050000, 24, 2, 'pcs', '6/128GB, garansi resmi'),
  ('AK-0001', 'Charger Type C 25W',    'Charger',          60000,   95000, 60, 5, 'pcs', 'Charger fast charging 25W'),
  ('AK-0002', 'Charger Type C 33W',    'Charger',          80000,  125000, 50, 5, 'pcs', 'Charger fast charging 33W'),
  ('AK-0003', 'Kabel Data Type C',     'Kabel',            20000,   35000, 90, 5, 'pcs', 'Kabel data braided 1 meter'),
  ('AK-0004', 'Tempered Glass',        'Tempered Glass',   15000,   30000, 80, 5, 'pcs', 'Anti gores 9H'),
  ('AK-0005', 'Casing Silikon',        'Casing',           25000,   45000, 60, 5, 'pcs', 'Casing silikon transparan'),
  ('AK-0006', 'Headset Bluetooth',     'Headset',         120000,  185000, 35, 3, 'pcs', 'Headset TWS dengan kabel'),
  ('AK-0007', 'Powerbank 10000mAh',    'Powerbank',       180000,  275000, 25, 2, 'pcs', 'Powerbank kapasitas 10000mAh'),
  ('AK-0008', 'Casing Anti Shock',     'Casing',           30000,   55000, 40, 5, 'pcs', 'Casing anti shock tebal')
) as data (kode_produk, nama_produk, kategori, harga_beli, harga_jual, stok, stok_minimum, satuan, deskripsi)
join public.categories c on c.name = data.kategori
on conflict (kode_produk) do nothing;

-- ----------------------------------------------------------------------------
-- TRANSAKSI DUMMY — 14 hari terakhir (data real melalui create_transaction RPC
-- sehingga konsisten dengan stock movement & pengurangan stok)
-- ----------------------------------------------------------------------------
do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000002';
  v_p_id uuid;
  v_items jsonb;
  v_discount numeric;
  v_paid numeric;
  v_total numeric;
  v_item_count integer;
  v_payment text;
  v_res jsonb;
  v_created timestamptz;
  v_attempt integer;
begin
  -- Hari 1..14 (hari 0 = hari ini), jam kerja 08:00-19:59 WIB
  for v_day in reverse 14..0 loop
    v_created := (now() - make_interval(days => v_day))::date
                 + (8 + floor(random() * 12)) * interval '1 hour'
                 + floor(random() * 60) * interval '1 minute'
                 + floor(random() * 60) * interval '1 second';

    -- 1 - 4 transaksi per hari
    for v_tx_idx in 1..(1 + floor(random() * 3))::int loop
      v_items := '[]'::jsonb;
      v_item_count := 1 + floor(random() * 3)::int;

      -- Pilih 1-3 produk acak yang aktif dan masih punya stok
      for v_p_id in (
        select id from public.products where is_active and stok > 0 order by random() limit v_item_count
      ) loop
        v_items := v_items || jsonb_build_object(
          'product_id', v_p_id,
          'quantity', 1 + floor(random() * 3)::int
        );
      end loop;

      -- Diskon: 0-25% kadang-kadang
      v_discount := case when random() < 0.3 then (random() * 25000)::numeric(14,2) else 0 end;

      -- Metode pembayaran acak
      v_payment := (array['CASH', 'CASH', 'TRANSFER', 'QRIS', 'DEBIT', 'EWALLET'])[1 + floor(random() * 6)::int];

      -- Hitung total dari data produk untuk menentukan paid
      select coalesce(sum(p.harga_jual * (i.value ->> 'quantity')::int), 0)::numeric
        into v_total
        from jsonb_array_elements(v_items) i
        join public.products p on p.id = (i.value ->> 'product_id')::uuid;

      v_total := v_total - v_discount;

      if v_payment = 'CASH' then
        -- Bayar pas / lebih (kembalian)
        v_paid := v_total + (case when random() < 0.4 then round((random()*50000)::numeric, -4) else 0 end)::numeric;
      else
        v_paid := v_total;
      end if;

      v_created := v_created + (v_tx_idx * 90 + 30) * interval '1 second';

      v_attempt := 0;
      loop
        begin
          select public.create_transaction(jsonb_build_object(
            'user_id',        v_user,
            'items',          v_items,
            'discount',       v_discount,
            'paid_amount',    v_paid,
            'payment_method', v_payment,
            'created_at',     v_created,
            'notes',          'seed'
          )) into v_res;
          exit;
        exception when others then
          -- stok kurang → kurangi qty salah satu item lalu coba lagi
          if v_attempt > 20 then exit; end if;
          if v_attempt = 0 then
            v_items := (select jsonb_agg(jsonb_set(i.value, '{quantity}', to_jsonb(greatest((i.value ->> 'quantity')::int - 1, 1))))
                        from jsonb_array_elements(v_items) i);
            v_discount := 0;
          end if;
          v_attempt := v_attempt + 1;
          -- hitung ulang total
          select coalesce(sum(p.harga_jual * (i.value ->> 'quantity')::int), 0)::numeric
            into v_total
            from jsonb_array_elements(v_items) i
            join public.products p on p.id = (i.value ->> 'product_id')::uuid;
          v_total := v_total - v_discount;
          v_paid := v_total;
        end;
      end loop;
    end loop;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- SETTING TOKO
-- ----------------------------------------------------------------------------
insert into public.store_settings (id, store_name, address, phone, receipt_footer)
values (1, 'TOKO ADAM CELL', 'Jl. Contoh No. 123, Kota', '08xxxxxxxxxx',
        'Terima kasih sudah berbelanja! Barang yang sudah dibeli tidak dapat dikembalikan.')
on conflict (id) do update set
  store_name = excluded.store_name,
  address = excluded.address,
  phone = excluded.phone,
  receipt_footer = excluded.receipt_footer;

insert into public.printer_settings (id, printer_name, connection_type, paper_width_mm, bluetooth_address)
values (1, '', 'bluetooth', 58, '')
on conflict (id) do nothing;