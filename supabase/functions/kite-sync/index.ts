// kite-sync: READ-ONLY Zerodha Kite integration for Investing Dashboard.
// POST { request_token?: string }
//  - with request_token: exchanges it for a daily access token (after Kite login redirect), then syncs
//  - without: re-syncs using today's stored token (returns 401 + needs_login if expired)
// Never places, modifies or cancels orders. Secrets: KITE_API_KEY, KITE_API_SECRET.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const KITE = "https://api.kite.trade";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function kiteGet(path: string, apiKey: string, token: string) {
  const r = await fetch(`${KITE}${path}`, {
    headers: { "X-Kite-Version": "3", Authorization: `token ${apiKey}:${token}` },
  });
  const body = await r.json();
  return { ok: r.ok && body.status === "success", status: r.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("KITE_API_KEY");
  const apiSecret = Deno.env.get("KITE_API_SECRET");
  if (!apiKey || !apiSecret)
    return json({ error: "KITE_API_KEY / KITE_API_SECRET secrets not set" }, 500);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let payload: { request_token?: string } = {};
  try {
    payload = await req.json();
  } catch {
    /* empty body */
  }

  // 1) Get an access token: exchange a fresh request_token, or reuse today's stored one
  let accessToken: string | undefined;
  if (payload.request_token) {
    const checksum = await sha256Hex(apiKey + payload.request_token + apiSecret);
    const r = await fetch(`${KITE}/session/token`, {
      method: "POST",
      headers: { "X-Kite-Version": "3", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: payload.request_token,
        checksum,
      }),
    });
    const s = await r.json();
    if (!r.ok || s.status !== "success")
      return json({ error: "Kite login failed", detail: s.message }, 400);
    accessToken = s.data.access_token;
    await admin.from("kite_session").upsert({
      user_id: user.id,
      access_token: accessToken,
      kite_user_id: s.data.user_id,
      updated_at: new Date().toISOString(),
    });
  } else {
    const { data } = await admin
      .from("kite_session")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    accessToken = data?.access_token;
    if (!accessToken)
      return json(
        {
          needs_login: true,
          login_url: `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`,
        },
        401,
      );
  }

  // 2) Read holdings (equity + mutual funds)
  const eq = await kiteGet("/portfolio/holdings", apiKey, accessToken!);
  if (!eq.ok) {
    if (eq.status === 403)
      return json(
        {
          needs_login: true,
          login_url: `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`,
        },
        401,
      );
    return json({ error: "Kite holdings fetch failed", detail: eq.body?.message }, 502);
  }
  const mf = await kiteGet("/mf/holdings", apiKey, accessToken!);
  const now = new Date().toISOString();

  const eqRows = (eq.body.data ?? []).map((h: any) => ({
    user_id: user.id,
    source: "kite",
    symbol: h.tradingsymbol,
    exchange: h.exchange,
    isin: h.isin,
    quantity: (h.quantity ?? 0) + (h.t1_quantity ?? 0),
    avg_price: h.average_price,
    last_price: h.last_price,
    close_price: h.close_price,
    day_change_pct: h.day_change_percentage,
    pnl: h.pnl,
    currency: "INR",
    snapshot_at: now,
  }));
  const mfRows = mf.ok
    ? (mf.body.data ?? []).map((h: any) => ({
        user_id: user.id,
        source: "kite_mf",
        symbol: h.tradingsymbol,
        exchange: "MF",
        name: h.fund,
        quantity: h.quantity,
        avg_price: h.average_price,
        last_price: h.last_price,
        pnl: h.pnl,
        currency: "INR",
        snapshot_at: now,
      }))
    : [];

  // Replace Kite rows with the fresh snapshot (Revolut/manual rows untouched)
  for (const [src, rows] of [
    ["kite", eqRows],
    ["kite_mf", mfRows],
  ] as const) {
    await admin.from("holdings").delete().eq("user_id", user.id).eq("source", src);
    if (rows.length) {
      const { error } = await admin.from("holdings").insert(rows);
      if (error)
        return json({ error: `Saving ${src} holdings failed`, detail: error.message }, 500);
    }
    const invested = rows.reduce((a: number, r: any) => a + (r.avg_price ?? 0) * r.quantity, 0);
    const current = rows.reduce((a: number, r: any) => a + (r.last_price ?? 0) * r.quantity, 0);
    await admin.from("portfolio_snapshots").upsert(
      {
        user_id: user.id,
        snapshot_date: now.slice(0, 10),
        source: src,
        invested_value: invested,
        current_value: current,
        currency: "INR",
      },
      { onConflict: "user_id,snapshot_date,source" },
    );
  }

  return json({ ok: true, equity_count: eqRows.length, mf_count: mfRows.length, synced_at: now });
});
