begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); ca uuid; iid uuid; r text := ''; pd numeric;
begin
  select id into ca from cash_accounts where business_id = b and is_active limit 1;
  iid := create_invoice(b, 'sale', current_date, null, 'Tes Guard', 100000, 0, null, 'tes', null);
  perform record_payment(iid, ca, 40000, current_date);
  select paid into pd from invoices where id = iid;
  r := r || 'sah_paid=' || pd || ' (harus 40000);';
  perform set_config('finora.fin_write', '', true); -- simulasi permintaan API terpisah
  begin update invoices set paid = 100000 where id = iid; r := r || 'UPDATE_paid=LOLOS(BUG);'; exception when others then r := r || 'UPDATE_paid=ditolak;'; end;
  begin update invoices set total = 1, subtotal = 1 where id = iid; r := r || 'UPDATE_total=LOLOS(BUG);'; exception when others then r := r || 'UPDATE_total=ditolak;'; end;
  begin update invoices set deleted_at = now() where id = iid; r := r || 'UPDATE_softdel=LOLOS(BUG);'; exception when others then r := r || 'UPDATE_softdel=ditolak;'; end;
  begin delete from invoices where id = iid; r := r || 'DELETE=LOLOS(BUG);'; exception when others then r := r || 'DELETE=ditolak;'; end;
  begin insert into payments(business_id, invoice_id, cash_account_id, amount, paid_on, created_by) values (b, iid, ca, 1, current_date, auth.uid()); r := r || 'INSERT_pay=LOLOS(BUG);'; exception when others then r := r || 'INSERT_pay=ditolak;'; end;
  begin update invoices set notes = 'diubah' where id = iid; r := r || 'UPDATE_notes=boleh;'; exception when others then r := r || 'UPDATE_notes=DITOLAK(BUG);'; end;
  perform record_payment(iid, ca, 60000, current_date);
  select paid into pd from invoices where id = iid; r := r || 'lunas_paid=' || pd || ' (harus 100000);';
  raise exception 'ROLLBACK_OK %', r;
end $$;
rollback;
