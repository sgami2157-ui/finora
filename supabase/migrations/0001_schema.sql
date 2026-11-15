-- FINORA schema. Semua nominal numeric(18,2). Timezone default aplikasi: Asia/Jakarta.
create extension if not exists pgcrypto;

create type account_type as enum ('asset','liability','equity','revenue','cogs','expense');
create type normal_balance as enum ('debit','credit');
create type member_role as enum ('owner','admin','accountant','staff','viewer');
create type journal_status as enum ('draft','posted','reversed');
create type invoice_type as enum ('sale','purchase','expense');
create type cash_kind as enum ('cash','bank');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ===== Identitas & multi-bisnis =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  currency char(3) not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index on business_members(user_id);

create table business_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  inventory_method text not null default 'weighted_average' check (inventory_method in ('weighted_average')),
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  locked_until date, -- periode <= tanggal ini tidak boleh diposting lagi
  updated_at timestamptz not null default now()
);

-- ===== Akuntansi inti =====
create table accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null,
  name text not null,
  type account_type not null,
  normal_balance normal_balance not null,
  parent_id uuid references accounts(id),
  is_cash boolean not null default false,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code),
  unique (business_id, id),
  check ((type in ('asset','expense','cogs') and normal_balance = 'debit')
      or (type in ('liability','equity','revenue') and normal_balance = 'credit'))
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  number text not null,
  entry_date date not null,
  description text not null,
  kind text not null default 'general'
    check (kind in ('general','cash_in','cash_out','sale','purchase','adjustment','closing','transfer','reversal')),
  status journal_status not null default 'draft',
  reverses_id uuid references journal_entries(id),
  source_type text,            -- 'invoice','payment','inventory', dst.
  source_id uuid,
  created_by uuid not null references auth.users(id),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, number),
  unique (business_id, id)
);
create index on journal_entries(business_id, entry_date);
create index on journal_entries(business_id, status);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  entry_id uuid not null,
  account_id uuid not null,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
  foreign key (business_id, entry_id) references journal_entries(business_id, id) on delete cascade,
  foreign key (business_id, account_id) references accounts(business_id, id)
);
create index on journal_lines(business_id, entry_id);
create index on journal_lines(business_id, account_id);

create table cash_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  account_id uuid not null,
  name text not null,
  kind cash_kind not null,
  bank_name text,
  account_number text,
  opening_balance numeric(18,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, account_id) references accounts(business_id, id)
);

-- ===== Pihak =====
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, phone text, email text, address text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, id)
);
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, phone text, email text, address text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, id)
);

-- ===== Penjualan / pembelian / biaya (satu tabel, mencegah data ganda) =====
create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  type invoice_type not null,
  number text not null,
  issue_date date not null,
  due_date date,
  customer_id uuid, supplier_id uuid,
  subtotal numeric(18,2) not null check (subtotal >= 0),
  discount numeric(18,2) not null default 0 check (discount >= 0),
  total numeric(18,2) not null check (total >= 0),
  paid numeric(18,2) not null default 0 check (paid >= 0),
  category text,
  notes text,
  journal_entry_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, number),
  unique (business_id, id),
  check (paid <= total),
  check (total = subtotal - discount),
  foreign key (business_id, customer_id) references customers(business_id, id),
  foreign key (business_id, supplier_id) references suppliers(business_id, id),
  foreign key (business_id, journal_entry_id) references journal_entries(business_id, id)
);
create index on invoices(business_id, type, issue_date);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null,
  cash_account_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  paid_on date not null,
  journal_entry_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (business_id, invoice_id) references invoices(business_id, id),
  foreign key (business_id, cash_account_id) references cash_accounts(business_id, id),
  foreign key (business_id, journal_entry_id) references journal_entries(business_id, id)
);
create index on payments(business_id, invoice_id);

-- Piutang & utang = invoice belum lunas
create view v_receivables with (security_invoker = true) as
  select i.*, (i.total - i.paid) as outstanding,
    case when i.paid >= i.total then 'lunas' when i.paid > 0 then 'sebagian' else 'belum_dibayar' end as payment_status
  from invoices i where i.type = 'sale' and i.deleted_at is null;
create view v_payables with (security_invoker = true) as
  select i.*, (i.total - i.paid) as outstanding,
    case when i.paid >= i.total then 'lunas' when i.paid > 0 then 'sebagian' else 'belum_dibayar' end as payment_status
  from invoices i where i.type in ('purchase','expense') and i.deleted_at is null;

-- ===== Persediaan =====
create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sku text, name text not null,
  sell_price numeric(18,2) not null default 0 check (sell_price >= 0),
  stock_qty numeric(18,4) not null default 0,
  stock_value numeric(18,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, id)
);
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, unit text not null,
  stock_qty numeric(18,4) not null default 0,
  stock_value numeric(18,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, id)
);
create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null, ingredient_id uuid not null,
  qty numeric(18,4) not null check (qty > 0),
  unique (product_id, ingredient_id),
  foreign key (business_id, product_id) references products(business_id, id) on delete cascade,
  foreign key (business_id, ingredient_id) references ingredients(business_id, id)
);
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid, ingredient_id uuid,
  movement text not null check (movement in ('in','out','adjustment')),
  qty numeric(18,4) not null check (qty <> 0),
  unit_cost numeric(18,4) not null default 0,
  total_cost numeric(18,2) not null default 0,
  moved_on date not null,
  journal_entry_id uuid,
  invoice_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((product_id is null) <> (ingredient_id is null)),
  foreign key (business_id, product_id) references products(business_id, id),
  foreign key (business_id, ingredient_id) references ingredients(business_id, id),
  foreign key (business_id, journal_entry_id) references journal_entries(business_id, id)
);
create index on inventory_movements(business_id, moved_on);

-- ===== Dokumen & integrasi =====
create table attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category text not null check (category in ('invoice','receipt','transfer_proof','supplier_doc','customer_doc','report','backup','other')),
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text,           -- Supabase Storage
  drive_file_id text,          -- referensi Google Drive
  invoice_id uuid, journal_entry_id uuid,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (storage_path is not null or drive_file_id is not null)
);
create index on attachments(business_id, category, created_at);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  provider text not null check (provider in ('google_drive','macaly_cloud')),
  status text not null default 'disconnected' check (status in ('disconnected','connected','error','not_verified')),
  external_account text,
  -- refresh token terenkripsi di sisi server; JANGAN dibaca klien (lihat kebijakan RLS: tabel ini tidak bisa di-select kolom secret)
  encrypted_refresh_token text,
  root_folder_id text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, provider)
);
create table integration_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  provider text not null, action text not null, ok boolean not null, detail text,
  created_at timestamptz not null default now()
);
create table backup_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('backup','restore')),
  status text not null check (status in ('pending','verified','failed')),
  checksum_sha256 text, row_counts jsonb, drive_file_id text, detail text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('user','assistant')),
  content text not null,
  period_from date, period_to date,
  created_at timestamptz not null default now()
);
create index on ai_conversations(business_id, user_id, created_at);

create table audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid,
  user_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb, new_data jsonb,
  created_at timestamptz not null default now()
);
create index on audit_logs(business_id, created_at);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','businesses','accounts','journal_entries','cash_accounts','customers','suppliers','invoices','products','ingredients','integrations','business_settings']
  loop
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;
