-- 0013: langganan notifikasi push (Web Push/VAPID) + pengaturan cadangan otomatis Google Drive.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index on push_subscriptions(user_id);
create index on push_subscriptions(business_id);
alter table push_subscriptions enable row level security;
create policy push_sel on push_subscriptions for select using (user_id = (select auth.uid()));
create policy push_ins on push_subscriptions for insert with check (user_id = (select auth.uid()) and is_member(business_id));
create policy push_upd on push_subscriptions for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and is_member(business_id));
create policy push_del on push_subscriptions for delete using (user_id = (select auth.uid()));

-- Cadangan otomatis mingguan ke Drive: opt-in per bisnis (default mati).
alter table integrations add column backup_auto boolean not null default false;
grant select (backup_auto) on integrations to authenticated;
