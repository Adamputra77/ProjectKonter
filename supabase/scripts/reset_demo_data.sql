-- ============================================================================
-- RESET DATA DEMO
-- Hapus seluruh riwayat transaksi (dummy), kembalikan stok ke nilai awal seed.
-- Produk, kategori, user, dan setting TETAP dipertahankan.
-- Aman dijalankan ulang (idempotent). Berlaku untuk Supabase lokal maupun cloud.
-- ============================================================================

do $$
begin
  -- Hapus transaksi (transaction_items ikut terhapus via on delete cascade)
  delete from public.transactions;

  -- Hapus riwayat pergerakan stok (reference_id berupa teks, tanpa FK)
  delete from public.stock_movements;

  -- Hapus log audit demo
  delete from public.audit_logs;

  -- Kembalikan stok ke nilai awal seed
  update public.products p
  set stok = v.stok,
      updated_at = now()
  from (values
    ('HP-0001', 18), ('HP-0002', 25), ('HP-0003', 20), ('HP-0004', 22),
    ('HP-0005', 18), ('HP-0006', 25), ('HP-0007', 22), ('HP-0008', 24),
    ('AK-0001', 60), ('AK-0002', 50), ('AK-0003', 90), ('AK-0004', 80),
    ('AK-0005', 60), ('AK-0006', 35), ('AK-0007', 25), ('AK-0008', 40)
  ) as v (kode, stok)
  where v.kode = p.kode_produk;
end;
$$;