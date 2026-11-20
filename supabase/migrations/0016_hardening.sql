-- 0016: perbaikan keamanan & performa dari advisor Supabase.
-- 1) account_balances kembali memakai search_path tetap (regresi dari 0015).
-- 2) Indeks penutup untuk foreign key yang belum terindeks.
create or replace function account_balances(p_business uuid, p_from date, p_to date)
returns table(account_id uuid, code text, name text, type account_type, balance numeric)
language sql stable security invoker set search_path = public as $$
  select a.id, a.code, a.name, a.type,
    case when a.normal_balance = 'debit'
      then coalesce(sum(l.debit - l.credit),0) else coalesce(sum(l.credit - l.debit),0) end
  from accounts a
  left join journal_lines l on l.account_id = a.id and l.business_id = a.business_id
  left join journal_entries e on e.id = l.entry_id and e.status in ('posted','reversed')
    and (p_from is null or (e.entry_date >= p_from and e.kind <> 'closing')) and (p_to is null or e.entry_date <= p_to)
  where a.business_id = p_business
    and (l.id is null or e.id is not null)
  group by a.id
$$;

create index if not exists accounts_parent_id_idx on accounts (parent_id);
create index if not exists ai_conversations_user_id_idx on ai_conversations (user_id);
create index if not exists attachments_uploaded_by_idx on attachments (uploaded_by);
create index if not exists backup_logs_business_id_idx on backup_logs (business_id);
create index if not exists backup_logs_created_by_idx on backup_logs (created_by);
create index if not exists businesses_created_by_idx on businesses (created_by);
create index if not exists integration_logs_business_id_idx on integration_logs (business_id);
create index if not exists inventory_movements_created_by_idx on inventory_movements (created_by);
create index if not exists invoices_created_by_idx on invoices (created_by);
create index if not exists journal_entries_created_by_idx on journal_entries (created_by);
create index if not exists payments_created_by_idx on payments (created_by);
create index if not exists period_closings_closing_entry_id_idx on period_closings (closing_entry_id);
create index if not exists recipe_items_business_id_idx on recipe_items (business_id);
