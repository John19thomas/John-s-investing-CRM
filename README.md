# John Thomas · Investing Dashboard

One view of every investment: Indian equities synced from Zerodha Kite, global equities imported
from Revolut CSV statements, and a private-markets pipeline (Global and India) where Claude reads
IC memos. Public landing page and demo at `/` and `/demo`; the owner's live data sits behind sign-in at `/app`.

## Stack

| Layer     | What                                                                                       |
| --------- | ------------------------------------------------------------------------------------------ |
| Front end | React 19, TypeScript, Tailwind v4, Recharts, Motion, React Router, TanStack Query          |
| Back end  | Supabase: Postgres with row-level security, Storage (`private-docs`), Auth, Edge Functions |
| AI        | Claude (Anthropic API) inside edge functions: `summarize-memo`, `ask-dashboard`            |
| Hosting   | Vercel (static SPA)                                                                        |

## Edge functions (`supabase/functions/`)

| Function         | Purpose                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `kite-sync`      | Exchanges the Kite `request_token`, reads equity + MF holdings (read-only), records a daily snapshot |
| `revolut-import` | Parses a Revolut statement or holdings CSV into positions (average cost); preview or commit          |
| `summarize-memo` | Reads a PDF from `private-docs` with Claude; fills summary, takeaways, thesis, risks, metrics        |
| `ask-dashboard`  | Chat over the signed-in user's own data                                                              |

Secrets (Supabase → Edge Functions → Secrets): `ANTHROPIC_API_KEY`, `KITE_API_KEY`, `KITE_API_SECRET`.

## Develop

```bash
bun install
bun run dev        # http://localhost:5173  (try /demo/india)
bun run test       # Revolut parser tests
bun run build
```

The app defaults to the `investing-dashboard` Supabase project; override with `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).
