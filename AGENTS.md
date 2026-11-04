# Agent notes

- Front end: Vite + React 19 + TypeScript + Tailwind v4 in `src/`. Static SPA hosted on Vercel (`vercel.json` rewrites).
- Back end: Supabase project `investing-dashboard` (`cnvdpddhihjhrglbodud`). Edge functions live in
  `supabase/functions/`; shared pure-TS code in `supabase/functions/_shared/` is also imported by the
  front end via the `@shared/*` alias. Schema changes go in `supabase/migrations/`.
- Data access goes through the `Repo` interface (`src/data/types.ts`): `liveRepo` (Supabase) for
  `/app/*`, `demoRepo` (in-memory, fictional private companies) for the public `/demo/*`.
- Read-only by design: never add code that places or modifies broker orders.
- Before pushing: `bun run typecheck && bun run lint && bun run test && bun run build`.
- Do not rewrite published git history (no force pushes or amending pushed commits).
