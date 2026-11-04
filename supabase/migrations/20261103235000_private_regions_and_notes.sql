-- Applied to investing-dashboard on 2026-11-03.
-- Private investments split into Global and India, plus a notes timeline per company.
alter table public.private_companies
  add column if not exists region text not null default 'global'
    check (region in ('global', 'india')),
  add column if not exists invested_amount numeric
    check (invested_amount is null or invested_amount >= 0),
  add column if not exists round text;

create index if not exists private_companies_user_region_idx
  on public.private_companies (user_id, region);

create table if not exists public.company_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null references public.private_companies (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists company_notes_company_idx
  on public.company_notes (company_id, created_at desc);

alter table public.company_notes enable row level security;

create policy owner_all on public.company_notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.company_notes to authenticated;
grant all on public.company_notes to service_role;
