create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  name text,
  source text not null check (source in ('kite','kite_mf','revolut','manual')),
  asset_kind text not null default 'equity' check (asset_kind in ('equity','mutual_fund','crypto','other')),
  region text not null default 'global' check (region in ('india','global')),
  currency text not null default 'INR',
  quantity numeric not null default 0 check (quantity >= 0),
  avg_price numeric not null default 0 check (avg_price >= 0),
  last_price numeric check (last_price is null or last_price >= 0),
  last_price_updated_at timestamptz,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  taken_at timestamptz not null default now(),
  currency text not null default 'INR',
  total_value numeric not null check (total_value >= 0),
  day_change numeric,
  day_change_pct numeric,
  breakdown jsonb,
  created_at timestamptz not null default now()
);

create table public.earnings_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  company_name text,
  event_date date not null,
  kind text not null default 'earnings',
  notes text,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text,
  kind text not null default 'note',
  title text not null,
  body text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.private_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  status text not null default 'active' check (status in ('active','exited','written_off')),
  sector text,
  stage text,
  last_valuation numeric check (last_valuation is null or last_valuation >= 0),
  valuation_currency text not null default 'INR',
  invested_amount numeric check (invested_amount is null or invested_amount >= 0),
  thesis text,
  key_risks text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.private_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid not null references public.private_companies(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  widget_key text not null check (widget_key in ('total_value','india_global_split','day_change','top_movers','upcoming_earnings','latest_notes')),
  enabled boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, widget_key)
);

-- Grants (Supabase does not grant public schema defaults)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holdings TO authenticated;
GRANT ALL ON public.holdings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_snapshots TO authenticated;
GRANT ALL ON public.portfolio_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.earnings_events TO authenticated;
GRANT ALL ON public.earnings_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_companies TO authenticated;
GRANT ALL ON public.private_companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_documents TO authenticated;
GRANT ALL ON public.private_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_widgets TO authenticated;
GRANT ALL ON public.dashboard_widgets TO service_role;

-- Row level security: each user only ever sees and changes their own rows
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own holdings" ON public.holdings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own snapshots" ON public.portfolio_snapshots FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own earnings events" ON public.earnings_events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own analyses" ON public.analyses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own private companies" ON public.private_companies FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own private documents" ON public.private_documents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own dashboard widgets" ON public.dashboard_widgets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_analyses_updated_at BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_private_companies_updated_at BEFORE UPDATE ON public.private_companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpful indexes
CREATE INDEX holdings_user_idx ON public.holdings (user_id);
CREATE INDEX holdings_source_idx ON public.holdings (user_id, source);
CREATE INDEX snapshots_user_taken_idx ON public.portfolio_snapshots (user_id, taken_at);
CREATE INDEX earnings_user_date_idx ON public.earnings_events (user_id, event_date);
CREATE INDEX analyses_user_created_idx ON public.analyses (user_id, created_at DESC);
CREATE INDEX private_documents_company_idx ON public.private_documents (company_id);
CREATE INDEX widgets_user_idx ON public.dashboard_widgets (user_id, position);