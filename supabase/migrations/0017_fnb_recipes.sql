-- 0017: mode usaha (umum / F&B) dan resep per produk.
-- Aman untuk akuntansi: hanya menambah kolom dan satu RPC; tidak menyentuh jurnal, stok, atau saldo.
alter table business_settings add column if not exists business_type text not null default 'umum'
  check (business_type in ('umum','fnb'));
alter table ingredients add column if not exists ref_price numeric(18,4) check (ref_price is null or ref_price >= 0); -- harga beli per satuan bahan (acuan)

-- Simpan resep sebuah produk secara atomik. p_items = [{"name":"Lele","unit":"g","qty":180,"ref_price":0.032}, ...]
-- Bahan dicari menurut nama (tanpa beda huruf besar/kecil) per usaha; bila belum ada dibuat dengan stok 0.
create or replace function save_recipe(p_business uuid, p_product uuid, p_items jsonb)
returns integer language plpgsql security invoker set search_path = public as $$
declare it jsonb; ing uuid; n integer := 0; v_name text; v_unit text; v_qty numeric; v_price numeric; keep uuid[] := '{}';
begin
  if not is_member(p_business, array['owner','admin','accountant']::member_role[]) then
    raise exception 'Hanya pemilik, admin, atau akuntan yang dapat menyimpan resep';
  end if;
  if not exists (select 1 from products where id = p_product and business_id = p_business and deleted_at is null) then
    raise exception 'Produk tidak ditemukan';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Daftar bahan tidak valid'; end if;
  if jsonb_array_length(p_items) > 60 then raise exception 'Terlalu banyak bahan (maks. 60)'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    v_name := btrim(coalesce(it->>'name',''));
    v_unit := coalesce(it->>'unit','');
    v_qty := (it->>'qty')::numeric;
    v_price := nullif(it->>'ref_price','')::numeric;
    if v_name = '' or length(v_name) > 80 then raise exception 'Nama bahan tidak valid'; end if;
    if v_unit not in ('g','ml','pcs') then raise exception 'Satuan harus g, ml, atau pcs'; end if;
    if v_qty is null or v_qty <= 0 or v_qty > 1000000 then raise exception 'Takaran bahan % harus lebih dari 0', v_name; end if;
    if v_price is not null and v_price < 0 then raise exception 'Harga bahan % tidak boleh negatif', v_name; end if;
    select id into ing from ingredients where business_id = p_business and lower(name) = lower(v_name) and deleted_at is null limit 1;
    if ing is null then
      insert into ingredients(business_id, name, unit, ref_price) values (p_business, v_name, v_unit, v_price) returning id into ing;
    else
      update ingredients set unit = v_unit, ref_price = coalesce(v_price, ref_price), updated_at = now() where id = ing;
    end if;
    if ing = any(keep) then raise exception 'Bahan % tercatat dua kali', v_name; end if;
    keep := keep || ing;
    insert into recipe_items(business_id, product_id, ingredient_id, qty) values (p_business, p_product, ing, v_qty)
      on conflict (product_id, ingredient_id) do update set qty = excluded.qty;
    n := n + 1;
  end loop;
  delete from recipe_items where business_id = p_business and product_id = p_product and not (ingredient_id = any(keep));
  return n;
end $$;
revoke all on function save_recipe(uuid, uuid, jsonb) from public, anon;
grant execute on function save_recipe(uuid, uuid, jsonb) to authenticated;
