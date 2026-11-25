-- Tes rollback-only: mode usaha & resep. Sukses = exception 'ROLLBACK_OK ...'.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); p uuid; n integer; c1 integer; c2 integer; gl0 numeric; gl1 numeric; k integer;
begin
  select coalesce(sum(debit),0) into gl0 from journal_lines where business_id = b;
  update business_settings set business_type = 'fnb' where business_id = b;
  get diagnostics k = row_count;
  if k <> 1 then raise exception 'GAGAL: mode usaha tidak tersimpan'; end if;
  insert into products(business_id, name, sell_price) values (b, 'UJI Pecel Lele', 20000) returning id into p; -- dibatalkan oleh rollback
  n := save_recipe(b, p, '[{"name":"Lele","unit":"g","qty":180,"ref_price":0.032},{"name":"Beras","unit":"g","qty":90}]'::jsonb);
  if n <> 2 then raise exception 'GAGAL: jumlah bahan %', n; end if;
  select count(*) into c1 from recipe_items where product_id = p;
  if c1 <> 2 then raise exception 'GAGAL: resep tersimpan % baris', c1; end if;
  -- simpan ulang dengan satu bahan: bahan lain harus terhapus, bahan tidak duplikat
  n := save_recipe(b, p, '[{"name":"lele","unit":"g","qty":200}]'::jsonb);
  select count(*) into c2 from recipe_items where product_id = p;
  if c2 <> 1 then raise exception 'GAGAL: resep ulang % baris (harus 1)', c2; end if;
  if (select count(*) from ingredients where business_id = b and lower(name) = 'lele') <> 1 then raise exception 'GAGAL: bahan terduplikasi'; end if;
  begin perform save_recipe(b, p, '[{"name":"X","unit":"kg","qty":1}]'::jsonb); raise exception 'GAGAL: satuan salah diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform save_recipe(b, p, '[{"name":"X","unit":"g","qty":0}]'::jsonb); raise exception 'GAGAL: takaran 0 diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform save_recipe(b, gen_random_uuid(), '[{"name":"X","unit":"g","qty":1}]'::jsonb); raise exception 'GAGAL: produk asing diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform save_recipe(b, p, '[{"name":"A","unit":"g","qty":1},{"name":"a","unit":"g","qty":2}]'::jsonb); raise exception 'GAGAL: bahan ganda diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  select coalesce(sum(debit),0) into gl1 from journal_lines where business_id = b;
  if gl1 <> gl0 then raise exception 'GAGAL: resep mengubah jurnal'; end if;
  raise exception 'ROLLBACK_OK mode usaha, resep tersimpan & diganti atomik, input tidak valid ditolak, jurnal tidak berubah';
end $$;
rollback;
