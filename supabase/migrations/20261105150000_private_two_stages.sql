-- Private company tracker: two stages only, Tracking (stored as 'watching') and Invested.
update public.private_companies set status = 'watching' where status not in ('watching', 'invested');
alter table public.private_companies drop constraint if exists private_companies_status_check;
alter table public.private_companies
  add constraint private_companies_status_check check (status in ('watching', 'invested'));
