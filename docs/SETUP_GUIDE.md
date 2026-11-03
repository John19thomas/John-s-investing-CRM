# How Lovable, Supabase and Claude Code fit together

```
 You (no code)
   │  describe screens in plain English            describe backend jobs in plain English
   ▼                                                ▼
 Lovable  ── front end (pages, tables, buttons) ── Claude Code ── backend (database, functions)
   │            commits to GitHub  ◄──────────────────┘ commits to GitHub
   ▼                                                ▼
 Browser app  ──── reads/writes ────►  Supabase project "investing-dashboard"
                                        • Postgres tables (holdings, private_companies…)
                                        • Storage bucket "private-docs" (IC memo PDFs)
                                        • Edge functions (kite-sync, revolut-import,
                                          summarize-memo, ask-dashboard)
                                        • Secrets (Anthropic key, Kite key) – never in the browser
```

**Rule of thumb:** Lovable owns `src/` (what you see). Claude Code owns `supabase/` (data and logic).
Both push to the same GitHub repo, so each sees the other's work.

## Backend that already exists (Supabase project `investing-dashboard`)

| Function | What the UI sends | What it returns |
|---|---|---|
| `kite-sync` | `{}` or `{ request_token }` | `{ ok, equity_count, mf_count }` or `401 { needs_login, login_url }` |
| `revolut-import` | `{ csv, commit: false }` → preview; `{ csv, commit: true }` → save | `{ format, positions[], warnings[] }` |
| `summarize-memo` | `{ document_id, apply_to_company: true }` | `{ summary, key_takeaways, thesis, key_risks, key_metrics }` |
| `ask-dashboard` | `{ message, conversation_id? }` | `{ reply, conversation_id }` |

Main tables: `holdings`, `portfolio_snapshots`, `private_companies`, `private_documents`,
`chat_messages`, `financials`, `announcements`, `analyses`, `earnings_events`, `dashboard_widgets`.
PDFs go in bucket `private-docs` under `<user_id>/<company_id>/<filename>`.

## Step 1: Point Lovable at `investing-dashboard`

Today the Lovable project uses Lovable's own managed database, which is a different one with
different tables. The app UI is still a blank placeholder, so switching costs you nothing.

1. In Lovable, open the project's Supabase / Cloud integration settings and see whether it lets you
   connect a different Supabase project. If it does, pick **investing-dashboard**.
2. If it won't let you switch (projects that started on Lovable Cloud often can't), create a **new**
   Lovable project. Before writing any prompts, connect Supabase and choose **investing-dashboard**.
   Then connect GitHub (Settings → GitHub) so Claude Code can see the code.
3. Send Lovable this first message:
   > This app uses an existing Supabase backend that is managed outside Lovable. Do NOT create
   > tables, migrations, storage buckets or edge functions. Only build front-end code that reads
   > the existing tables and calls the existing edge functions via `supabase.functions.invoke`.

## Step 2: Secrets (Supabase dashboard → Edge Functions → Secrets)

- `ANTHROPIC_API_KEY`: needed by the chatbot and the memo reader
- `KITE_API_KEY`, `KITE_API_SECRET`: from developers.kite.trade
- In the Kite developer console, set the **Redirect URL** to `https://<your-app-domain>/kite/callback`

## Step 3: Lovable prompts (send one at a time and check each before the next)

1. **Shell:** "Build an Attio-style CRM layout: email login (Supabase Auth), left sidebar with
   Home, Holdings, Private, Chat. Dense tables, Inter font, right-side detail panel when a row is
   clicked, green/red for P&L. Read-only investing app with no trading."
2. **Holdings:** "Holdings page: table from `holdings` (symbol, name, source, quantity,
   avg_price, last_price, pnl, currency), filter chips by source (kite, kite_mf, revolut, manual),
   totals at top, and a 'Last synced' time from max(snapshot_at)."
3. **Kite:** "Add a 'Sync Kite' button that calls `supabase.functions.invoke('kite-sync')`. If the
   response has `needs_login`, redirect to `login_url`. Add route `/kite/callback` that reads
   `request_token` from the URL, calls `kite-sync` with `{ request_token }`, then goes to Holdings."
4. **Revolut:** "Add 'Import Revolut CSV': a drag-and-drop dialog that reads the file as text and
   calls `revolut-import` with `{ csv, commit: false }`. Show the returned `positions` in a preview
   table plus any `warnings`, then a Confirm button that calls it again with `commit: true` and
   refreshes Holdings."
5. **Private:** "Private page: Attio-style table of `private_companies` (name, sector, stage,
   status, last_valuation). Detail panel shows thesis, key_risks, key_metrics and a Documents
   list from `private_documents`. Upload PDFs to storage bucket `private-docs` at path
   `<user_id>/<company_id>/<filename>`, insert a `private_documents` row, then call
   `summarize-memo` with `{ document_id, apply_to_company: true }` and show the summary and
   takeaways. Add an in-app PDF viewer using a signed URL."
6. **Chat:** "Chat page plus a floating chat button: send messages to `ask-dashboard` with
   `{ message, conversation_id }`, keep `conversation_id` for follow-ups, render the reply as
   markdown."

## Step 4: Day-to-day loop

- Looks wrong or needs a new screen → ask **Lovable**.
- Needs new data, a new integration, or smarter AI → ask **Claude Code**. It writes and deploys
  the Supabase change, commits it to GitHub, and tells you what Lovable prompt to send next.
- Never let Lovable create migrations against this project. If Lovable says it "needs a table",
  bring that request to Claude Code instead.
