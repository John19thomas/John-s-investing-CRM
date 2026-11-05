// quotes: refreshes the signed-in user's holding prices from free market-data sources.
// POST { scope?: "revolut" | "india" | "all", force?: boolean }
//   -> { updated, failed: string[], skipped, provider }
// Prices fetched less than 60 seconds ago are kept unless force is true.
// Secrets: FINNHUB_API_KEY (optional; without it Yahoo Finance is used for everything).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pool, priceUpdate, quoteFor, type QuoteRow } from "../_shared/quotes.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const FRESH_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: { scope?: string; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const sources =
    body.scope === "revolut"
      ? ["revolut"]
      : body.scope === "india"
        ? ["kite"]
        : ["kite", "revolut"];

  const { data: rows, error } = await db
    .from("holdings")
    .select("id, source, symbol, exchange, quantity, avg_price, price_at")
    .in("source", sources);
  if (error) return json({ error: "Couldn't read holdings", detail: error.message }, 500);

  const now = Date.now();
  const due = (rows ?? []).filter(
    (r) => body.force || !r.price_at || now - new Date(r.price_at).getTime() > FRESH_MS,
  ) as (QuoteRow & { price_at: string | null })[];

  const key = Deno.env.get("FINNHUB_API_KEY") ?? null;
  const failed: string[] = [];
  let updated = 0;
  await pool(due, 6, async (r) => {
    const q = await quoteFor(r, key);
    if (!q) {
      failed.push(r.symbol);
      return;
    }
    const u = await db.from("holdings").update(priceUpdate(r, q)).eq("id", r.id);
    if (u.error) failed.push(r.symbol);
    else updated++;
  });

  return json({
    updated,
    failed,
    skipped: (rows ?? []).length - due.length,
    provider: key ? "finnhub (US) + yahoo" : "yahoo",
  });
});
