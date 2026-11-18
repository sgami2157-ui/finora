-- Batas stok minimum per produk (aditif, aman): dipakai menandai stok menipis. 0 = tidak dipantau.
alter table products add column if not exists min_stock numeric(18,4) not null default 0 check (min_stock >= 0);
