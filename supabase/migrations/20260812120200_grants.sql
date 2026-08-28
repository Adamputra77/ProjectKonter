-- ============================================================================
-- POS Kounter HP — GRANTS
-- Supabase lokal tidak memberikan table-level GRANT secara otomatis.
-- (Cloud Supabase sudah punya default grants; migration ini aman di kedua
-- environment. Keamanan baris tetap dijaga oleh RLS policies.)
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- authenticated: hak penuh di level tabel, RLS yang membatasi per baris
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- service_role: melewati RLS (hanya dipakai server-side)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- anon: TIDAK mendapat akses tabel. Fungsi publik hanya untuk authenticated.
grant execute on function public.next_invoice_number(timestamptz) to service_role;
revoke execute on all functions in schema public from anon;