-- Research is done from Claude chat sessions (no Anthropic API key on the server), so the
-- pg_cron job that called research-company is removed, and a writer function stores
-- research in the same shape as research-company's save_research tool input.
-- Applied to investing-dashboard on 2026-11-05 as migration chat_research_writer.
select cron.unschedule('refresh-stale-research');

-- See the live definition with: select pg_get_functiondef('public.save_company_research'::regproc);
-- Signature: public.save_company_research(p_symbol text, r jsonb) returns text
-- Upserts company_profiles (profile, presentation, valuation inputs, cheatsheet, ARR, next
-- results date) and replaces financials rows (annual, ttm, quarter; margins, FCF = CFO − |capex|
-- and YoY growth computed). Execute is revoked from public, anon and authenticated.
