// public-portfolio: the data behind the public landing page.
// GET or POST, no sign-in needed. Visitors get percentages only (weights, day moves, returns),
// company names and logos, and counts for the private tracker. When the caller is signed in as
// the owner, amounts are included too. Private-company names and deal details are never returned.
// Prices older than 5 minutes are refreshed first (Yahoo / Finnhub, see _shared/quotes.ts).
// Secrets: OWNER_USER_ID (optional; defaults to the only user with holdings), FINNHUB_API_KEY (optional).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pool, priceUpdate, quoteFor, usdInr, type QuoteRow } from "../_shared/quotes.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const STALE_MS = 5 * 60_000;

type Row = QuoteRow & {
  user_id: string;
  name: string | null;
  currency: string;
  last_price: number | null;
  close_price: number | null;
  day_change_pct: number | null;
  price_at: string | null;
};

const num = (x: unknown) => (x == null ? null : Number(x));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let owner = Deno.env.get("OWNER_USER_ID") ?? null;
  if (!owner) {
    const { data } = await admin.from("holdings").select("user_id").limit(1).maybeSingle();
    owner = data?.user_id ?? null;
  }
  if (!owner) return json({ empty: true });

  // Is the caller the owner? Then amounts are included.
  let isOwner = false;
  const auth = req.headers.get("Authorization");
  if (auth) {
    const userDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data } = await userDb.auth.getUser();
    isOwner = data.user?.id === owner;
  }

  const load = async () => {
    const { data, error } = await admin
      .from("holdings")
      .select(
        "id, user_id, source, symbol, exchange, name, currency, quantity, avg_price, last_price, close_price, day_change_pct, price_at",
      )
      .eq("user_id", owner)
      .in("source", ["kite", "revolut"]);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  };

  let rows: Row[];
  try {
    rows = await load();
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  // Refresh stale prices (bounded so the page stays fast).
  const now = Date.now();
  const stale = rows.filter((r) => !r.price_at || now - new Date(r.price_at).getTime() > STALE_MS);
  const [fx] = await Promise.all([
    usdInr(),
    stale.length
      ? Promise.race([
          pool(stale, 8, async (r) => {
            const q = await quoteFor(r, Deno.env.get("FINNHUB_API_KEY") ?? null);
            if (q) {
              const u = priceUpdate(r, q);
              Object.assign(r, u);
              await admin.from("holdings").update(u).eq("id", r.id);
            }
          }),
          new Promise((res) => setTimeout(res, 8000)),
        ])
      : Promise.resolve(),
  ]);

  const { data: profiles } = await admin
    .from("company_profiles")
    .select("symbol, name, website, one_liner, sector, cheatsheet, researched_at")
    .eq("user_id", owner);
  const prof = new Map((profiles ?? []).map((p) => [p.symbol, p]));

  // Per-holding figures in their own currency; INR equivalents for combining.
  const toInr = (ccy: string, v: number) => (ccy === "INR" ? v : fx ? v * fx : null);
  const items = rows.map((r) => {
    const qty = Number(r.quantity);
    const cost = qty * Number(r.avg_price ?? 0);
    const last = num(r.last_price);
    const value = last != null ? qty * last : cost;
    const prevClose = num(r.close_price);
    const prevValue = prevClose ? qty * prevClose : null;
    return {
      r,
      segment: r.source === "kite" ? "india" : "global",
      cost,
      value,
      prevValue,
      valueInr: toInr(r.currency, value),
    };
  });

  const segment = (key: "india" | "global") => {
    const xs = items.filter((x) => x.segment === key);
    const value = xs.reduce((a, x) => a + x.value, 0);
    const cost = xs.reduce((a, x) => a + x.cost, 0);
    const withPrev = xs.filter((x) => x.prevValue);
    const prev = withPrev.reduce((a, x) => a + x.prevValue!, 0);
    const cur = withPrev.reduce((a, x) => a + x.value, 0);
    const latest = xs
      .map((x) => x.r.price_at)
      .filter(Boolean)
      .sort()
      .at(-1);
    return {
      key,
      label: key === "india" ? "India equities" : "Global equities",
      currency: key === "india" ? "INR" : "USD",
      count: xs.length,
      returnPct: cost ? (value / cost - 1) * 100 : null,
      dayChangePct: prev ? (cur / prev - 1) * 100 : null,
      pricesAt: latest ?? null,
      ...(isOwner ? { value, cost, dayChange: prev ? cur - prev : null } : {}),
    };
  };

  const segIndia = segment("india");
  const segGlobal = segment("global");
  const totalInr = items.reduce((a, x) => a + (x.valueInr ?? 0), 0);
  const indiaInr = items
    .filter((x) => x.segment === "india")
    .reduce((a, x) => a + (x.valueInr ?? 0), 0);

  const segTotals = { india: 0, global: 0 } as Record<string, number>;
  for (const x of items) segTotals[x.segment] += x.value;

  const holdings = items
    .map((x) => {
      const p = prof.get(x.r.symbol);
      return {
        symbol: x.r.symbol,
        name: p?.name ?? x.r.name ?? x.r.symbol,
        website: p?.website ?? null,
        oneLiner: p?.one_liner ?? null,
        sector: p?.sector ?? null,
        segment: x.segment,
        weightPct: fx && totalInr && x.valueInr != null ? (x.valueInr / totalInr) * 100 : null,
        segmentWeightPct: segTotals[x.segment] ? (x.value / segTotals[x.segment]!) * 100 : null,
        dayChangePct: num(x.r.day_change_pct),
        returnPct: x.cost ? (x.value / x.cost - 1) * 100 : null,
        ...(isOwner ? { value: x.value, currency: x.r.currency } : {}),
      };
    })
    .sort((a, b) => (b.segmentWeightPct ?? 0) - (a.segmentWeightPct ?? 0));

  const updates = (profiles ?? [])
    .filter((p) => p.cheatsheet && typeof p.cheatsheet === "object")
    .map((p) => {
      const c = p.cheatsheet as { period?: string; headline?: string; results_date?: string };
      return {
        symbol: p.symbol,
        name: p.name ?? p.symbol,
        website: p.website,
        period: c.period ?? null,
        headline: c.headline ?? null,
        date: c.results_date ?? p.researched_at?.slice(0, 10) ?? null,
      };
    })
    .filter((u) => u.headline && rows.some((r) => r.symbol === u.symbol))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);

  const { data: priv } = await admin
    .from("private_companies")
    .select("status")
    .eq("user_id", owner);
  const count = (s: string) => (priv ?? []).filter((c) => c.status === s).length;

  return json({
    asOf: new Date().toISOString(),
    owner: isOwner,
    fxUsdInr: fx,
    allocation:
      fx && totalInr
        ? { india: (indiaInr / totalInr) * 100, global: 100 - (indiaInr / totalInr) * 100 }
        : null,
    ...(isOwner ? { totalInr: fx ? totalInr : null } : {}),
    segments: [segIndia, segGlobal],
    holdings,
    updates,
    private: {
      total: (priv ?? []).length,
      tracking: count("watching"),
      invested: count("invested"),
      passed: count("passed"),
    },
  });
});
