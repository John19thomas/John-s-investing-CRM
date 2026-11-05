-- Live prices, quarterly company cheatsheets, and a scheduled refresh of stale research.

-- 1. Holdings: when and where the last price came from.
alter table public.holdings
  add column if not exists price_at timestamptz,
  add column if not exists price_source text;

-- 2. Company profiles: quarterly cheatsheet and ARR (only where the company discloses it).
alter table public.company_profiles
  add column if not exists cheatsheet jsonb,
  add column if not exists arr_millions numeric,
  add column if not exists arr_label text,
  add column if not exists arr_as_of text,
  add column if not exists next_earnings_date date;

-- 3. Server-only settings (no grants to anon/authenticated, so the API can't read it).
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
grant all on public.app_config to service_role;

insert into public.app_config (key, value)
values
  ('functions_url', 'https://cnvdpddhihjhrglbodud.supabase.co/functions/v1'),
  ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- 4. Scheduler: research holdings with no research yet, research older than ~a quarter,
--    or research from before the company's last results date. A few per run to spread load.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.refresh_stale_research(max_jobs int default 3)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  url text := (select value from app_config where key = 'functions_url');
  secret text := (select value from app_config where key = 'cron_secret');
  t record;
  n int := 0;
begin
  for t in
    select distinct on (h.user_id, h.symbol)
      h.user_id, h.symbol, h.name, h.exchange
    from holdings h
    left join company_profiles p on p.user_id = h.user_id and p.symbol = h.symbol
    where h.source in ('kite', 'revolut')
      and (
        p.id is null
        or (p.research_status in ('idle', 'done') and (
              p.researched_at is null
              or p.researched_at < now() - interval '92 days'
              or (p.next_earnings_date is not null
                  and p.next_earnings_date + 2 <= current_date
                  and p.researched_at < p.next_earnings_date + 2)))
        or (p.research_status = 'running' and p.research_started_at < now() - interval '30 minutes')
        or (p.research_status = 'error' and p.research_started_at < now() - interval '1 day')
      )
    order by h.user_id, h.symbol
    limit max_jobs
  loop
    perform net.http_post(
      url := url || '/research-company',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
      body := jsonb_build_object(
        'symbol', t.symbol, 'name', t.name, 'exchange', t.exchange, 'user_id', t.user_id),
      timeout_milliseconds := 10000
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.refresh_stale_research(int) from public, anon, authenticated;

select cron.schedule('refresh-stale-research', '*/20 * * * *', $$select public.refresh_stale_research(3)$$);
