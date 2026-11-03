# Roadmap — Investing Dashboard

Brief: read-only personal investing app; email login; Inter font; dense CRM tables; left sidebar; side-panel details; green/red for P&L; mobile-friendly. No trading features ever.

## Tasks
- [x] Confirm Supabase connection; user confirmed project is new/empty → create schema here (user override of "do not create tables")
- [ ] Migration: tables holdings, portfolio_snapshots, earnings_events, analyses, private_companies, private_documents, dashboard_widgets (+ grants, RLS, updated_at triggers)
- [ ] Storage bucket private-docs (private) + storage RLS policies
- [ ] Email auth (login/signup routes) + protected app shell with left sidebar
- [ ] Home page — widgets from dashboard_widgets (defaults if none) + "Customise view" panel
- [ ] Holdings page — unified table (Kite / Kite MF / Revolut / Manual filters), P&L + weight columns, portfolio value chart from portfolio_snapshots, "Last synced"
- [ ] Kite sync — edge function kite-sync, "Sync Kite" button, needs_login → login_url redirect, /kite/callback route
- [ ] Revolut CSV upload — preview rows, then upsert source='revolut' with currency from file
- [ ] Analyst page — analyses feed (markdown, sources) filtered by symbol/kind + earnings_events calendar
- [ ] Private investments — private_companies table + detail panel (thesis, risks, metrics, documents)
- [ ] PDF upload to private-docs bucket (<user_id>/<company_id>/<filename>) recorded in private_documents; in-app PDF viewer
- [ ] Route head metadata on every content route
- [ ] Verify: build OK, auth flow, read/write flow, RLS isolation

## Blocked / pending
- Kite credentials (Zerodha API key + secret) — needed for live sync; function returns needs_login / not_configured until set.
- Git sync — user will connect in More → Settings → Git (agent cannot do it).
