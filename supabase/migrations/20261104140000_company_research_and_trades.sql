-- Applied to investing-dashboard on 2026-11-04 (two migrations: company_research_and_trades,
-- transactions_allow_split).
create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null,
  name text,
  website text,
  one_liner text,
  description text,
  sector text,
  country text,
  is_fund boolean not null default false,
  reporting_currency text,
  investor_presentation_title text,
  investor_presentation_url text,
  investor_presentation_date text,
  ir_url text,
  market_cap_millions numeric,
  net_debt_millions numeric,
  shares_outstanding_millions numeric,
  valuation_as_of date,
  research_notes text,
  sources jsonb not null default '[]'::jsonb,
  research_status text not null default 'idle'
    check (research_status in ('idle', 'running', 'done', 'error')),
  research_error text,
  research_started_at timestamptz,
  researched_at timestamptz,
  memo_md text,
  memo_status text not null default 'idle'
    check (memo_status in ('idle', 'running', 'done', 'error')),
  memo_error text,
  memo_started_at timestamptz,
  memo_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);
alter table public.company_profiles enable row level security;
create policy owner_all on public.company_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.company_profiles to authenticated;
grant all on public.company_profiles to service_role;

alter table public.financials
  add column if not exists cfo numeric,
  add column if not exists capex numeric,
  add column if not exists net_income numeric;
alter table public.financials drop constraint if exists financials_period_type_check;
alter table public.financials
  add constraint financials_period_type_check check (period_type in ('quarter', 'annual', 'ttm'));

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('kite', 'kite_mf', 'revolut', 'manual')),
  symbol text not null,
  trade_date date not null,
  side text not null check (side in ('buy', 'sell', 'dividend', 'split')),
  quantity numeric not null default 0,
  price numeric not null default 0,
  amount numeric,
  currency text not null default 'INR',
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index if not exists transactions_user_symbol_idx
  on public.transactions (user_id, symbol, trade_date);
alter table public.transactions enable row level security;
create policy owner_all on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
