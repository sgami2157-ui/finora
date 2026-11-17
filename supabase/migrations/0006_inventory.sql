-- Produk & persediaan: stok hanya berubah lewat fungsi transaksi; HPP rata-rata tertimbang.
-- Semua fungsi security invoker (RLS tetap berlaku) dan atomik dalam satu transaksi.

-- Penjaga: klien tidak boleh mengubah stok/nilai stok langsung lewat API tabel.
create or replace function guard_stock_write() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('finora.stock_write', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    if new.stock_qty <> 0 or new.stock_value <> 0 then raise exception 'Stok awal hanya dapat diisi lewat transaksi stok'; end if;
  elsif new.stock_qty is distinct from old.stock_qty or new.stock_value is distinct from old.stock_value then
    raise exception 'Stok hanya dapat diubah lewat transaksi stok';
  end if;
  return new;
end $$;
drop trigger if exists products_stock_guard on products;
create trigger products_stock_guard before insert or update on products for each row execute function guard_stock_write();

create or replace function create_product(p_business uuid, p_name text, p_sku text, p_price numeric)
returns uuid language plpgsql security invoker set search_path = public as $$
declare pid uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Nama produk wajib diisi'; end if;
  if coalesce(p_price, 0) < 0 then raise exception 'Harga jual tidak boleh negatif'; end if;
  insert into products(business_id, name, sku, sell_price)
    values (p_business, trim(p_name), nullif(trim(coalesce(p_sku, '')), ''), coalesce(p_price, 0)) returning id into pid;
  return pid;
end $$;

-- Tambah stok = pembelian barang (jurnal: Dr Persediaan / Cr Kas atau Utang) + pencatatan pergerakan stok.
create or replace function stock_in(
  p_business uuid, p_product uuid, p_qty numeric, p_unit_cost numeric, p_date date,
  p_supplier text, p_due date, p_pay_cash uuid
) returns uuid language plpgsql security invoker set search_path = public as $$
declare pr products; v_total numeric; iid uuid; jid uuid;
begin
  if p_qty is null or p_qty <= 0 then raise exception 'Jumlah barang harus lebih dari nol'; end if;
  if p_unit_cost is null or p_unit_cost <= 0 then raise exception 'Harga beli per barang harus lebih dari nol'; end if;
  select * into pr from products where id = p_product and business_id = p_business and deleted_at is null for update;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
  v_total := round(p_qty * p_unit_cost, 2);
  if v_total <= 0 then raise exception 'Total pembelian terlalu kecil'; end if;
  iid := create_invoice(p_business, 'purchase', p_date, p_due, p_supplier, v_total, 0, null,
                        'Stok masuk: ' || pr.name || ' x ' || p_qty, p_pay_cash);
  select journal_entry_id into jid from invoices where id = iid;
  perform set_config('finora.stock_write', '1', true);
  update products set stock_qty = stock_qty + p_qty, stock_value = stock_value + v_total, updated_at = now() where id = pr.id;
  perform set_config('finora.stock_write', '', true);
  insert into inventory_movements(business_id, product_id, movement, qty, unit_cost, total_cost, moved_on, journal_entry_id, invoice_id, created_by)
    values (p_business, pr.id, 'in', p_qty, p_unit_cost, v_total, p_date, jid, iid, auth.uid());
  return iid;
end $$;

-- Penjualan per produk: jurnal penjualan (lewat create_invoice) + jurnal HPP (Dr HPP / Cr Persediaan)
-- dengan biaya rata-rata tertimbang saat ini. Menolak penjualan melebihi stok.
create or replace function create_sale(
  p_business uuid, p_date date, p_due date, p_party text, p_items jsonb, p_discount numeric, p_notes text, p_pay_cash uuid
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  it jsonb; pr products; q numeric; price numeric; cogs numeric; subtotal numeric := 0; total_cogs numeric := 0;
  iid uuid; jid uuid; num text; hpp uuid; inv uuid; mov uuid; mov_ids uuid[] := '{}';
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Pilih minimal satu produk'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Maksimal 100 baris produk per penjualan'; end if;
  select id into hpp from accounts where business_id = p_business and code = '5-1100';
  select id into inv from accounts where business_id = p_business and code = '1-1400';
  if hpp is null or inv is null then raise exception 'Bagan akun standar tidak lengkap'; end if;

  perform set_config('finora.stock_write', '1', true);
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::numeric; price := (it->>'unit_price')::numeric;
    if q is null or q <= 0 then raise exception 'Jumlah produk harus lebih dari nol'; end if;
    if price is null or price <= 0 then raise exception 'Harga jual harus lebih dari nol'; end if;
    select * into pr from products where id = (it->>'product_id')::uuid and business_id = p_business and deleted_at is null for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    if q > pr.stock_qty then raise exception 'Stok % tidak cukup (tersisa %)', pr.name, pr.stock_qty; end if;
    cogs := case when q = pr.stock_qty then pr.stock_value else round(q * pr.stock_value / pr.stock_qty, 2) end;
    update products set stock_qty = stock_qty - q, stock_value = stock_value - cogs, updated_at = now() where id = pr.id;
    insert into inventory_movements(business_id, product_id, movement, qty, unit_cost, total_cost, moved_on, created_by)
      values (p_business, pr.id, 'out', q, round(cogs / q, 4), cogs, p_date, auth.uid()) returning id into mov;
    mov_ids := mov_ids || mov;
    subtotal := subtotal + round(q * price, 2);
    total_cogs := total_cogs + cogs;
  end loop;
  perform set_config('finora.stock_write', '', true);

  iid := create_invoice(p_business, 'sale', p_date, p_due, p_party, subtotal, coalesce(p_discount, 0), null, p_notes, p_pay_cash);
  select number into num from invoices where id = iid;
  if total_cogs > 0 then
    jid := create_journal_entry(p_business, 'HPP-' || num, p_date, 'HPP ' || num, 'general',
      jsonb_build_array(jsonb_build_object('account_id', hpp, 'debit', total_cogs, 'credit', 0),
                        jsonb_build_object('account_id', inv, 'debit', 0, 'credit', total_cogs)), true);
  end if;
  update inventory_movements set invoice_id = iid, journal_entry_id = jid where id = any(mov_ids);
  return iid;
end $$;

-- Penyesuaian stok (stok opname). Selisih dijurnal ke Beban Lain-lain terhadap Persediaan.
create or replace function adjust_stock(p_business uuid, p_product uuid, p_new_qty numeric, p_unit_cost numeric, p_date date, p_reason text)
returns void language plpgsql security invoker set search_path = public as $$
declare pr products; diff numeric; val numeric; unit numeric; jid uuid; inv uuid; oth uuid; lines jsonb;
begin
  if p_new_qty is null or p_new_qty < 0 then raise exception 'Jumlah stok tidak boleh negatif'; end if;
  select * into pr from products where id = p_product and business_id = p_business and deleted_at is null for update;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
  diff := p_new_qty - pr.stock_qty;
  if diff = 0 then raise exception 'Jumlah sama dengan stok yang tercatat'; end if;
  select id into inv from accounts where business_id = p_business and code = '1-1400';
  select id into oth from accounts where business_id = p_business and code = '6-1900';
  if diff < 0 then
    val := case when p_new_qty = 0 then pr.stock_value else round(-diff * pr.stock_value / pr.stock_qty, 2) end;
    lines := jsonb_build_array(jsonb_build_object('account_id', oth, 'debit', val, 'credit', 0), jsonb_build_object('account_id', inv, 'debit', 0, 'credit', val));
  else
    unit := coalesce(p_unit_cost, case when pr.stock_qty > 0 then pr.stock_value / pr.stock_qty end);
    if unit is null or unit <= 0 then raise exception 'Isi harga per barang untuk penambahan stok'; end if;
    val := round(diff * unit, 2);
    lines := jsonb_build_array(jsonb_build_object('account_id', inv, 'debit', val, 'credit', 0), jsonb_build_object('account_id', oth, 'debit', 0, 'credit', val));
  end if;
  if val > 0 then
    jid := create_journal_entry(p_business, 'ADJ-' || to_char(p_date, 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)), p_date,
      'Penyesuaian stok ' || pr.name || coalesce(' - ' || nullif(trim(p_reason), ''), ''), 'general', lines, true);
  end if;
  perform set_config('finora.stock_write', '1', true);
  update products set stock_qty = p_new_qty, stock_value = stock_value + case when diff < 0 then -val else val end, updated_at = now() where id = pr.id;
  perform set_config('finora.stock_write', '', true);
  insert into inventory_movements(business_id, product_id, movement, qty, unit_cost, total_cost, moved_on, journal_entry_id, created_by)
    values (p_business, pr.id, 'adjustment', diff, round(val / abs(diff), 4), val, p_date, jid, auth.uid());
end $$;

revoke execute on function guard_stock_write(), create_product(uuid, text, text, numeric),
  stock_in(uuid, uuid, numeric, numeric, date, text, date, uuid),
  create_sale(uuid, date, date, text, jsonb, numeric, text, uuid),
  adjust_stock(uuid, uuid, numeric, numeric, date, text) from public, anon, authenticated;
grant execute on function create_product(uuid, text, text, numeric),
  stock_in(uuid, uuid, numeric, numeric, date, text, date, uuid),
  create_sale(uuid, date, date, text, jsonb, numeric, text, uuid),
  adjust_stock(uuid, uuid, numeric, numeric, date, text) to authenticated;
