-- Private company tracker uses three stages: Tracking (stored as 'watching'), Invested, Passed.
update public.private_companies set status = 'watching' where status = 'evaluated';

alter table public.private_companies drop constraint if exists private_companies_status_check;
alter table public.private_companies
  add constraint private_companies_status_check check (status in ('watching', 'invested', 'passed'));
