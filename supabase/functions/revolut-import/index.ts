// revolut-import: turns a Revolut stock CSV into holdings rows (source = 'revolut').
// POST { csv: string, commit?: boolean }
//  - commit false/omitted: preview only -> { format, positions, warnings, rows_read }
//  - commit true: replaces this user's existing Revolut holdings with the parsed positions
// Runs as the signed-in user (RLS applies). Kite / manual holdings are never touched.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseRevolutCsv } from "../_shared/revolut.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_CSV_BYTES = 5 * 1024 * 1024;

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

  let body: { csv?: string; commit?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send JSON: { csv: string, commit?: boolean }" }, 400);
  }
  const csv = body.csv ?? "";
  if (!csv.trim()) return json({ error: "The CSV is empty" }, 400);
  if (csv.length > MAX_CSV_BYTES) return json({ error: "CSV is larger than 5 MB" }, 413);

  let parsed;
  try {
    parsed = parseRevolutCsv(csv);
  } catch (e) {
    return json({ error: (e as Error).message }, 422);
  }
  if (!body.commit) return json({ ...parsed, committed: false });

  if (parsed.positions.length === 0) {
    return json({ error: "No open positions found in this file, so nothing was changed." }, 422);
  }

  const now = new Date().toISOString();
  const rows = parsed.positions.map((p) => ({
    user_id: user.id,
    source: "revolut",
    symbol: p.symbol,
    name: p.name,
    exchange: null,
    quantity: p.quantity,
    avg_price: p.avg_price,
    last_price: p.last_price,
    pnl: p.last_price != null ? (p.last_price - p.avg_price) * p.quantity : null,
    currency: p.currency,
    snapshot_at: now,
  }));

  const del = await db.from("holdings").delete().eq("user_id", user.id).eq("source", "revolut");
  if (del.error) return json({ error: "Couldn't clear old Revolut holdings", detail: del.error.message }, 500);
  const ins = await db.from("holdings").insert(rows);
  if (ins.error) return json({ error: "Saving Revolut holdings failed", detail: ins.error.message }, 500);

  return json({ ...parsed, committed: true, saved: rows.length, imported_at: now });
});
