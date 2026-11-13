// ask-dashboard: in-app chatbot for Investing Dashboard.
// POST { message: string, conversation_id?: string } -> { reply, conversation_id }
// Reads the signed-in user's own data (RLS-scoped) and answers with Claude.
// Secrets: ANTHROPIC_API_KEY (required), CHAT_MODEL (optional, default claude-sonnet-5-5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { portfolioXirr, positionStats, type Trade } from "../_shared/performance.ts";

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

const SYSTEM = `You are the analyst built into JT's investing dashboard, a read-only personal portfolio app.
Answer using the PORTFOLIO DATA provided. Style: IC-grade, metrics-first, concise. Lead with the answer, then the numbers.
Rules:
- Distinguish reported figures from estimates, and cite the period (e.g. Q2 FY27) and currency/unit for every number.
- If the data needed is not in PORTFOLIO DATA, say so plainly; you may add general knowledge but label it as such and note it may be out of date.
- For XIRR questions use the xirr block: quote blended_by_book for a book and by_holding for a stock, say how many holdings the blended figure covers, and say when a figure is an estimate or not calculable.
- Never invent figures. Never give buy/sell instructions; frame views as considerations, not advice.
- For private companies, draw on thesis, risks, metrics and document takeaways to help John revise and articulate his view.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key)
    return json(
      {
        error: "The chatbot needs an Anthropic API key",
        detail: "Add ANTHROPIC_API_KEY in Supabase → Edge Functions → Secrets",
        needs_key: true,
      },
      503,
    );

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: { message?: string; conversation_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* */
  }
  const message = (body.message ?? "").trim();
  if (!message) return json({ error: "Empty message" }, 400);
  const conversation_id = body.conversation_id ?? crypto.randomUUID();

  const [
    holdings,
    financials,
    announcements,
    analyses,
    earnings,
    companies,
    docs,
    history,
    profiles,
    notes,
    txns,
  ] = await Promise.all([
    db
      .from("holdings")
      .select(
        "source,symbol,exchange,name,quantity,avg_price,last_price,day_change_pct,pnl,currency,sector,snapshot_at",
      ),
    db
      .from("financials")
      .select(
        "symbol,period_label,period_end,period_type,is_estimate,currency,unit,revenue,gross_margin_pct,ebitda,ebitda_margin_pct,free_cash_flow,revenue_yoy_pct,ebitda_yoy_pct,notes,source_url",
      )
      .order("period_end", { ascending: false })
      .limit(200),
    db
      .from("announcements")
      .select("symbol,announced_on,category,title,summary,importance,source_url")
      .order("announced_on", { ascending: false })
      .limit(60),
    db
      .from("analyses")
      .select("symbol,kind,title,summary,created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    db
      .from("earnings_events")
      .select("symbol,event_date,fiscal_period,status")
      .gte("event_date", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10))
      .order("event_date")
      .limit(50),
    db
      .from("private_companies")
      .select(
        "id,name,sector,stage,status,context,thesis,key_risks,key_metrics,last_valuation,valuation_currency",
      ),
    db.from("private_documents").select("company_id,title,doc_type,summary,key_takeaways"),
    db
      .from("chat_messages")
      .select("role,content")
      .eq("conversation_id", conversation_id)
      .order("created_at")
      .limit(20),
    db
      .from("company_profiles")
      .select(
        "symbol,name,one_liner,sector,reporting_currency,market_cap_millions,shares_outstanding_millions,arr_millions,arr_label,arr_as_of,cheatsheet,next_earnings_date,researched_at",
      ),
    db
      .from("company_notes")
      .select("company_id,body,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("transactions")
      .select("source,symbol,trade_date,side,quantity,price,amount,external_id")
      .order("trade_date")
      .limit(5000),
  ]);

  // XIRR per holding and blended per book, computed from the trade ledger (same maths as the UI).
  const today = new Date().toISOString().slice(0, 10);
  const pctOf = (x: number | null) => (x == null ? null : Math.round(x * 1000) / 10);
  const tradesOf = new Map<string, Trade[]>();
  const estimatedSymbols = new Set<string>();
  for (const t of txns.data ?? []) {
    const k = `${t.source}:${t.symbol}`;
    const list = tradesOf.get(k) ?? [];
    list.push({
      date: t.trade_date,
      side: t.side,
      quantity: Number(t.quantity),
      price: Number(t.price),
      amount: t.amount == null ? null : Number(t.amount),
    });
    tradesOf.set(k, list);
    if (String(t.external_id).startsWith("opening:")) estimatedSymbols.add(k);
  }
  const books: Record<
    string,
    { trades: Trade[]; value: number; covered: number; total: number; totalValue: number }
  > = {};
  const xirrByHolding = (holdings.data ?? []).map((h) => {
    const k = `${h.source}:${h.symbol}`;
    const qty = Number(h.quantity);
    const price = h.last_price == null ? null : Number(h.last_price);
    const st = positionStats(tradesOf.get(k) ?? [], qty, price, today);
    const book = h.source === "revolut" ? "global" : "india";
    const b = (books[book] ??= { trades: [], value: 0, covered: 0, total: 0, totalValue: 0 });
    const value = price != null ? qty * price : 0;
    b.total++;
    b.totalValue += value;
    if (st.complete) {
      b.covered++;
      b.value += value;
      b.trades.push(...(tradesOf.get(k) ?? []));
    }
    return {
      symbol: h.symbol,
      book,
      xirr_pct: pctOf(st.xirr),
      basis: !st.complete
        ? "purchase history incomplete, XIRR not calculable"
        : estimatedSymbols.has(k)
          ? "estimated from a hand-entered purchase date"
          : "from broker trades",
      held_since: st.heldSince,
      avg_holding_days: st.avgHoldingDays == null ? null : Math.round(st.avgHoldingDays),
    };
  });
  const xirrByBook = Object.fromEntries(
    Object.entries(books).map(([name, b]) => [
      name,
      {
        blended_xirr_pct: b.covered
          ? pctOf(portfolioXirr([{ trades: b.trades, value: b.value }], today))
          : null,
        holdings_covered: `${b.covered} of ${b.total}`,
        share_of_value_covered_pct: b.totalValue ? Math.round((b.value / b.totalValue) * 100) : 0,
      },
    ]),
  );

  // Benchmarks: trailing 1-year price return from Yahoo Finance (index levels, no dividends).
  const yearReturn = async (ticker: string) => {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`,
        { headers: { "User-Agent": "Mozilla/5.0 (compatible; investing-dashboard/1.0)" } },
      );
      if (!r.ok) return null;
      const j = await r.json();
      const closes: number[] = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
        (c: unknown): c is number => typeof c === "number" && c > 0,
      );
      if (closes.length < 2) return null;
      return Math.round((closes.at(-1)! / closes[0]! - 1) * 1000) / 10;
    } catch {
      return null;
    }
  };
  const [nifty, sp500] = await Promise.all([yearReturn("^NSEI"), yearReturn("^GSPC")]);

  const context = {
    today: new Date().toISOString().slice(0, 10),
    public_holdings: holdings.data ?? [],
    financials: financials.data ?? [],
    announcements: announcements.data ?? [],
    recent_analyst_notes: analyses.data ?? [],
    earnings_calendar: earnings.data ?? [],
    private_companies: companies.data ?? [],
    private_documents: docs.data ?? [],
    private_company_notes: notes.data ?? [],
    company_research: profiles.data ?? [],
    benchmarks_trailing_1y_price_return_pct: {
      nifty_50: nifty,
      sp_500: sp500,
      note: "Index price change over the last 12 months, excluding dividends. Compare with care: portfolio XIRR is money-weighted and covers each holding's own holding period, not exactly the last 12 months.",
    },
    xirr: {
      note: "Annualised return from actual cash flows. India is in INR, global in USD; they are not combined. Blended figures cover only holdings with complete purchase history.",
      blended_by_book: xirrByBook,
      by_holding: xirrByHolding,
    },
    notes_on_units:
      "financials money values are in millions of the stated currency; INR 1 crore = 10 million. private_companies status 'watching' means Tracking.",
  };

  // Skip empty turns and unanswered questions, so user and assistant turns alternate.
  const past: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of history.data ?? []) {
    if (typeof m.content !== "string" || !m.content.trim()) continue;
    if (m.role === "user" && past.at(-1)?.role === "user") past.pop();
    if (m.role === "assistant" && past.at(-1)?.role !== "user") continue;
    past.push({ role: m.role, content: m.content });
  }
  if (past.at(-1)?.role === "user") past.pop();
  const messages = [...past, { role: "user" as const, content: message }];

  const client = new Anthropic({ apiKey: key });
  let reply = "";
  try {
    // Non-streaming to stay inside the edge runtime's CPU limit. A generous max_tokens leaves room
    // for the model's thinking as well as the answer.
    const msg = await client.beta.messages.create({
      model: Deno.env.get("CHAT_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: "PORTFOLIO DATA (JSON):\n" + JSON.stringify(context) },
      ],
      messages,
    });
    reply = msg.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
    if (!reply)
      return json(
        {
          error: "The assistant returned an empty answer",
          detail: `stop_reason: ${msg.stop_reason}`,
        },
        502,
      );
  } catch (e) {
    if (e instanceof Anthropic.APIError)
      return json({ error: "Claude API error", detail: e.message }, 502);
    return json({ error: "The assistant failed", detail: (e as Error).message }, 500);
  }

  await db.from("chat_messages").insert([
    { user_id: user.id, conversation_id, role: "user", content: message },
    { user_id: user.id, conversation_id, role: "assistant", content: reply },
  ]);
  return json({ reply, conversation_id });
});
