// write-memo: writes an investment memo for one listed holding, explaining why it is held,
// using the saved research (profile + financials), the position itself (entry price, holding
// period, XIRR from the trade ledger) and any notes. Structure follows the investment-memo skill,
// adapted from private rounds to a listed position.
// POST { symbol } -> 202 { status: "running" }; result lands in company_profiles.memo_md.
// Secrets: ANTHROPIC_API_KEY (required), MEMO_MODEL (optional, default claude-opus-5-5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { positionStats, type Trade } from "../_shared/performance.ts";

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

const SYSTEM = `You write investment memos as a senior investor whose voice blends a16z's thesis-driven framing,
Benchmark's brevity and conviction, Kleiner Perkins' rigour on market structure and defensibility, and
Accel's discipline on metrics and comparables. Every sentence must earn its place.

The reader is the owner of this position. The memo exists so they can quickly understand why they hold it,
whether the thesis is intact, and what would change their mind. It is a listed company, not a private round.

Voice:
- Be opinionated and specific. Take a position and defend it with numbers.
- Data over adjectives. Never write "world-class", "leading", "best-in-class" or similar.
- Plain English, short paragraphs (2-4 sentences), no filler ("it is worth noting", "importantly").
- No false precision: use ranges where figures are estimates.
- Honest gaps: if something is not in the provided data, say "not in the research" or "unverified".
  Never invent figures, customers, people or events. Use only the DATA block and well-established
  public facts; mark general-knowledge statements as such and note they may be out of date.
- Build the argument progressively; the position view comes last and should feel earned.

Format: GitHub-flavoured Markdown. Start directly with the first heading (no title line). Sections:

## Summary
3-5 sentences: what the company does, the position (entry, holding period, return), and the core thesis
in compressed form. No recommendation here.

## Business and why it matters
What it sells, to whom, how it makes money. The structural forces that make the thesis work now.

## Financial performance
Use the financials table: revenue growth, gross margin, EBITDA margin, free cash flow (CFO - capex) and
cash conversion. Call out trends and anything that looks off. State the periods and currency.

## Valuation
Use the multiples provided (P/E, EV/EBITDA, EV/Sales, P/FCF, FCF yield). Say what the price implies
about future growth or margins. Compare with 2-4 relevant listed peers only if you are confident of
the comparison, and label peer figures as approximate.

## Competitive position and moat
Market structure, the main competitors, and the mechanism of any advantage. Rate the relevant moat
dimensions STRONG / MODERATE / LOW with one line of evidence each. Name the single biggest
competitive threat.

## Management and capital allocation
Only what is supported: leadership, ownership, buybacks, dividends, M&A, balance sheet (net debt).
If the research says little, keep this short and say so.

## The position
Entry price vs today, holding period, XIRR, weight in the portfolio, and what the original thesis
appears to be. If the trade history is incomplete, say so.

## Key risks and open questions
3-5 material risks, each with likelihood (high/medium/low), severity, and the mitigant or "no good
mitigant". Then specific open questions to check next (e.g. "confirm FY26 capex guidance").

## Position view
One of **Hold**, **Add**, **Trim** or **Exit**, in 3-5 sentences: the core reason, what would change
the view (the trigger to act), and what to monitor at the next results. This is the owner's own
analysis aid, not advice to anyone else.`;

const fmt = (n: number | null | undefined, d = 1) =>
  n == null || !Number.isFinite(n)
    ? "n/a"
    : n.toLocaleString("en-US", { maximumFractionDigits: d });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!Deno.env.get("ANTHROPIC_API_KEY"))
    return json({ error: "ANTHROPIC_API_KEY secret not set" }, 500);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: { symbol?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const symbol = (body.symbol ?? "").trim().toUpperCase();
  if (!symbol) return json({ error: "symbol is required" }, 400);

  const [profileRes, finRes, holdRes, allRes, txRes] = await Promise.all([
    db.from("company_profiles").select("*").eq("symbol", symbol).maybeSingle(),
    db.from("financials").select("*").eq("symbol", symbol).order("period_end"),
    db.from("holdings").select("*").eq("symbol", symbol),
    db.from("holdings").select("symbol,quantity,last_price,avg_price,currency,source"),
    db.from("transactions").select("*").eq("symbol", symbol).order("trade_date"),
  ]);
  const profile = profileRes.data;
  if (!profile || profile.research_status !== "done") {
    return json(
      { error: "Run the company research first, so the memo has facts to work from." },
      409,
    );
  }

  const mark = await db
    .from("company_profiles")
    .update({ memo_status: "running", memo_error: null, memo_started_at: new Date().toISOString() })
    .eq("symbol", symbol);
  if (mark.error)
    return json({ error: "Couldn't start the memo", detail: mark.error.message }, 500);

  const job = (async () => {
    try {
      const holding = (holdRes.data ?? [])[0];
      const qty = (holdRes.data ?? []).reduce((a, h) => a + Number(h.quantity), 0);
      const price = holding?.last_price != null ? Number(holding.last_price) : null;
      const ccy = holding?.currency ?? "";
      const value = price != null ? qty * price : null;
      const book = (allRes.data ?? []).filter((h) => h.currency === ccy);
      const bookValue = book.reduce(
        (a, h) => a + Number(h.quantity) * Number(h.last_price ?? h.avg_price ?? 0),
        0,
      );
      const trades: Trade[] = (txRes.data ?? []).map((t) => ({
        date: t.trade_date,
        side: t.side,
        quantity: Number(t.quantity),
        price: Number(t.price),
        amount: t.amount == null ? null : Number(t.amount),
      }));
      const stats = positionStats(trades, qty, price, new Date().toISOString().slice(0, 10));

      // Multiples from the latest TTM (or annual) period.
      const fins = finRes.data ?? [];
      const latest = [...fins].reverse().find((f) => f.period_type === "ttm") ?? fins.at(-1);
      const mcap = profile.market_cap_millions != null ? Number(profile.market_cap_millions) : null;
      const ev = mcap != null ? mcap + Number(profile.net_debt_millions ?? 0) : null;
      const ratio = (a: number | null, b: number | null | undefined) =>
        a != null && b != null && Number(b) > 0 ? a / Number(b) : null;

      const data = {
        company: {
          symbol,
          name: profile.name,
          one_liner: profile.one_liner,
          description: profile.description,
          sector: profile.sector,
          country: profile.country,
          is_fund: profile.is_fund,
          investor_presentation: profile.investor_presentation_title
            ? `${profile.investor_presentation_title} (${profile.investor_presentation_date ?? "date n/a"})`
            : null,
          research_notes: profile.research_notes,
        },
        financials_millions: {
          currency: profile.reporting_currency,
          periods: fins.map((f) => ({
            period: f.period_label,
            type: f.period_type,
            revenue: f.revenue,
            revenue_yoy_pct: f.revenue_yoy_pct,
            gross_margin_pct: f.gross_margin_pct,
            ebitda: f.ebitda,
            ebitda_margin_pct: f.ebitda_margin_pct,
            cfo: f.cfo,
            capex: f.capex,
            free_cash_flow: f.free_cash_flow,
            net_income: f.net_income,
          })),
        },
        valuation: {
          as_of: profile.valuation_as_of,
          market_cap_millions: mcap,
          net_debt_millions: profile.net_debt_millions,
          enterprise_value_millions: ev,
          pe: fmt(ratio(mcap, latest?.net_income)),
          ev_ebitda: fmt(ratio(ev, latest?.ebitda)),
          ev_sales: fmt(ratio(ev, latest?.revenue)),
          p_fcf: fmt(ratio(mcap, latest?.free_cash_flow)),
          fcf_yield_pct: fmt(
            latest?.free_cash_flow != null && mcap
              ? (Number(latest.free_cash_flow) / mcap) * 100
              : null,
          ),
          based_on_period: latest?.period_label ?? null,
        },
        position: {
          currency: ccy,
          quantity: qty,
          broker_average_price: holding?.avg_price,
          last_price: price,
          value,
          weight_in_book_pct: value != null && bookValue ? fmt((value / bookValue) * 100) : "n/a",
          unrealised_return_pct:
            price != null && holding?.avg_price
              ? fmt((price / Number(holding.avg_price) - 1) * 100)
              : "n/a",
          held_since: stats.heldSince,
          average_holding_days:
            stats.avgHoldingDays != null ? Math.round(stats.avgHoldingDays) : null,
          xirr_pct: stats.xirr != null ? fmt(stats.xirr * 100) : null,
          trade_history_complete: stats.complete,
          dividends_received: stats.dividends,
        },
      };

      const client = new Anthropic();
      // Non-streaming: Supabase's CPU-time limit is hit when parsing a long streamed response.
      const msg = await client.beta.messages.create({
        model: Deno.env.get("MEMO_MODEL") ?? "claude-opus-5-5",
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Write the memo for ${profile.name ?? symbol}. Today is ${new Date().toISOString().slice(0, 10)}.\n\nDATA:\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      });
      if (msg.stop_reason === "refusal") throw new Error("Claude declined to write this memo");
      const text = msg.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("\n")
        .trim();
      if (!text) throw new Error("The memo came back empty");

      await db
        .from("company_profiles")
        .update({
          memo_md: text,
          memo_status: "done",
          memo_error: null,
          memo_at: new Date().toISOString(),
        })
        .eq("symbol", symbol);
    } catch (e) {
      const message =
        e instanceof Anthropic.APIError ? `Claude API error: ${e.message}` : (e as Error).message;
      await db
        .from("company_profiles")
        .update({ memo_status: "error", memo_error: message })
        .eq("symbol", symbol);
    }
  })();
  EdgeRuntime.waitUntil(job);
  return json({ status: "running", symbol }, 202);
});
