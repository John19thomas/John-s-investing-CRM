// research-company: Claude researches one listed holding on the web and saves
//  - a profile (what it does, website for the logo, sector, latest investor presentation, IR page)
//  - key financials for recent fiscal years (revenue, gross profit, EBITDA, CFO, capex, net income)
//  - market cap / net debt / shares outstanding for valuation multiples
// POST { symbol, name?, exchange? } -> 202 { status: "running" }; progress is written to
// company_profiles.research_status, which the dashboard polls.
// Secrets: ANTHROPIC_API_KEY (required), RESEARCH_MODEL (optional, default claude-opus-5-5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";

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

const SYSTEM = `You are a meticulous equity research analyst building a fact sheet for one listed company.
Use web search and web fetch. Prefer primary sources: the company's investor-relations site, annual reports,
quarterly results, exchange filings (NSE/BSE, SEC, etc.). Use reputable data sites only to fill gaps.

Rules:
- Never guess a number. If you cannot find a figure from a source, use null.
- All money values are in MILLIONS of the company's reporting currency, as reported (not converted).
- Capex is a positive number (cash spent on property, plant and equipment and intangibles).
- EBITDA: use the company's reported EBITDA, or operating profit plus depreciation and amortisation.
- Banks, insurers and NBFCs: gross profit and EBITDA are not meaningful; use null and say so in notes.
- Funds and ETFs: set is_fund to true, describe the fund, and leave financials empty.
- one_liner: plain English, under 20 words, what the company actually does. No adjectives like "leading".
- The investor presentation must be the most recent one you can find (results deck or investor day),
  with a direct link (PDF or the page hosting it).
- When finished, call save_research exactly once with everything you found.`;

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;

const SAVE_TOOL = {
  name: "save_research",
  description: "Save the finished research for this company. Call once, at the end.",
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "website",
      "one_liner",
      "description",
      "sector",
      "country",
      "is_fund",
      "reporting_currency",
      "investor_presentation",
      "ir_url",
      "financials",
      "market_cap_millions",
      "net_debt_millions",
      "shares_outstanding_millions",
      "valuation_as_of",
      "sources",
      "notes",
    ],
    properties: {
      name: { type: "string" },
      website: { ...str, description: "Bare domain, e.g. ril.com" },
      one_liner: { type: "string" },
      description: {
        type: "string",
        description: "2-4 sentences: products, customers, where it makes money.",
      },
      sector: str,
      country: str,
      is_fund: { type: "boolean" },
      reporting_currency: { ...str, description: "ISO code, e.g. INR, USD, EUR, TWD" },
      investor_presentation: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "date", "period"],
        properties: {
          title: str,
          url: str,
          date: { ...str, description: "YYYY-MM-DD" },
          period: str,
        },
      },
      ir_url: str,
      financials: {
        type: "array",
        description: "Last 3 completed fiscal years, plus trailing twelve months if available.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "period_label",
            "period_end",
            "period_type",
            "revenue",
            "gross_profit",
            "ebitda",
            "cfo",
            "capex",
            "net_income",
            "source_url",
          ],
          properties: {
            period_label: { type: "string", description: "e.g. FY2025, TTM Sep 2025" },
            period_end: { type: "string", description: "YYYY-MM-DD" },
            period_type: { type: "string", enum: ["annual", "ttm"] },
            revenue: num,
            gross_profit: num,
            ebitda: num,
            cfo: num,
            capex: num,
            net_income: num,
            source_url: str,
          },
        },
      },
      market_cap_millions: num,
      net_debt_millions: { ...num, description: "Debt minus cash; negative means net cash." },
      shares_outstanding_millions: num,
      valuation_as_of: { ...str, description: "YYYY-MM-DD" },
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "url"],
          properties: { title: { type: "string" }, url: { type: "string" } },
        },
      },
      notes: { type: "string", description: "Caveats, gaps, definitions used." },
    },
  },
} as const;

type Research = {
  name: string;
  website: string | null;
  one_liner: string;
  description: string;
  sector: string | null;
  country: string | null;
  is_fund: boolean;
  reporting_currency: string | null;
  investor_presentation: {
    title: string | null;
    url: string | null;
    date: string | null;
    period: string | null;
  };
  ir_url: string | null;
  financials: {
    period_label: string;
    period_end: string;
    period_type: "annual" | "ttm";
    revenue: number | null;
    gross_profit: number | null;
    ebitda: number | null;
    cfo: number | null;
    capex: number | null;
    net_income: number | null;
    source_url: string | null;
  }[];
  market_cap_millions: number | null;
  net_debt_millions: number | null;
  shares_outstanding_millions: number | null;
  valuation_as_of: string | null;
  sources: { title: string; url: string }[];
  notes: string;
};

// The streamed tool input is parsed tolerantly, so check its shape before saving.
function validate(x: unknown): Research {
  const r = x as Research;
  if (!r || typeof r !== "object") throw new Error("Research result was empty");
  if (typeof r.name !== "string" || typeof r.one_liner !== "string")
    throw new Error("Research result incomplete");
  if (!Array.isArray(r.financials) || !Array.isArray(r.sources))
    throw new Error("Research result incomplete");
  if (!r.investor_presentation || typeof r.investor_presentation !== "object")
    throw new Error("Research result incomplete");
  return r;
}

const isDate = (s: string | null | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const cleanDomain = (s: string | null) =>
  s
    ? s
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
        .toLowerCase() || null
    : null;

async function research(
  symbol: string,
  name: string | null,
  exchange: string | null,
): Promise<Research> {
  const client = new Anthropic();
  const who = [name, `ticker ${symbol}`, exchange ? `listed on ${exchange}` : null]
    .filter(Boolean)
    .join(", ");
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Research this holding: ${who}. Today is ${new Date().toISOString().slice(0, 10)}.`,
    },
  ];

  for (let i = 0; i < 8; i++) {
    const msg = await client.beta.messages
      .stream({
        model: Deno.env.get("RESEARCH_MODEL") ?? "claude-opus-5-5",
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 8 },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 },
          SAVE_TOOL,
        ],
        messages,
      })
      .finalMessage();

    if (msg.stop_reason === "refusal") throw new Error("Claude declined this research request");
    const call = msg.content.find((b) => b.type === "tool_use" && b.name === "save_research");
    if (call && call.type === "tool_use") return validate(call.input);
    if (msg.stop_reason === "max_tokens")
      throw new Error("Research ran out of space before finishing");

    messages.push({ role: "assistant", content: msg.content });
    // pause_turn: the server resumes the search loop when the turn is sent back as-is.
    if (msg.stop_reason !== "pause_turn") {
      messages.push({
        role: "user",
        content:
          "Now call save_research with what you found. Use null for anything you could not verify.",
      });
    }
  }
  throw new Error("Research did not finish");
}

async function save(db: SupabaseClient, userId: string, symbol: string, r: Research) {
  const ip = r.investor_presentation;
  const profile = await db.from("company_profiles").upsert(
    {
      user_id: userId,
      symbol,
      name: r.name,
      website: cleanDomain(r.website),
      one_liner: r.one_liner,
      description: r.description,
      sector: r.sector,
      country: r.country,
      is_fund: r.is_fund,
      reporting_currency: r.reporting_currency,
      investor_presentation_title: ip.title,
      investor_presentation_url: ip.url,
      investor_presentation_date: [ip.period, ip.date].filter(Boolean).join(" · ") || null,
      ir_url: r.ir_url,
      market_cap_millions: r.market_cap_millions,
      net_debt_millions: r.net_debt_millions,
      shares_outstanding_millions: r.shares_outstanding_millions,
      valuation_as_of: isDate(r.valuation_as_of) ? r.valuation_as_of : null,
      research_notes: r.notes,
      sources: r.sources.slice(0, 20),
      research_status: "done",
      research_error: null,
      researched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,symbol" },
  );
  if (profile.error) throw new Error(profile.error.message);

  await db.from("financials").delete().eq("user_id", userId).eq("symbol", symbol);
  const periods = r.financials
    .filter((f) => isDate(f.period_end))
    .sort((a, b) => a.period_end.localeCompare(b.period_end));
  const rows = periods.map((f) => {
    const prev = periods
      .filter((p) => p.period_type === "annual" && p.period_end < f.period_end)
      .at(-1);
    const pct = (a: number | null, b: number | null) => (a != null && b ? (a / b) * 100 : null);
    return {
      user_id: userId,
      symbol,
      company_name: r.name,
      period_label: f.period_label,
      period_end: f.period_end,
      period_type: f.period_type,
      is_estimate: false,
      currency: r.reporting_currency ?? "USD",
      unit: "millions",
      revenue: f.revenue,
      gross_profit: f.gross_profit,
      gross_margin_pct: pct(f.gross_profit, f.revenue),
      ebitda: f.ebitda,
      ebitda_margin_pct: pct(f.ebitda, f.revenue),
      cfo: f.cfo,
      capex: f.capex,
      net_income: f.net_income,
      free_cash_flow: f.cfo != null && f.capex != null ? f.cfo - Math.abs(f.capex) : null,
      revenue_yoy_pct:
        f.period_type === "annual" && prev?.revenue && f.revenue != null
          ? (f.revenue / prev.revenue - 1) * 100
          : null,
      ebitda_yoy_pct:
        f.period_type === "annual" && prev?.ebitda && f.ebitda != null
          ? (f.ebitda / prev.ebitda - 1) * 100
          : null,
      source_url: f.source_url,
    };
  });
  if (rows.length) {
    const ins = await db.from("financials").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
}

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

  let body: { symbol?: string; name?: string; exchange?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const symbol = (body.symbol ?? "").trim().toUpperCase();
  if (!symbol) return json({ error: "symbol is required" }, 400);

  const start = await db.from("company_profiles").upsert(
    {
      user_id: user.id,
      symbol,
      ...(body.name ? { name: body.name } : {}),
      research_status: "running",
      research_error: null,
      research_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,symbol", ignoreDuplicates: false },
  );
  if (start.error)
    return json({ error: "Couldn't start research", detail: start.error.message }, 500);

  const job = (async () => {
    try {
      const r = await research(symbol, body.name ?? null, body.exchange ?? null);
      await save(db, user.id, symbol, r);
    } catch (e) {
      const message =
        e instanceof Anthropic.APIError ? `Claude API error: ${e.message}` : (e as Error).message;
      await db
        .from("company_profiles")
        .update({
          research_status: "error",
          research_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("symbol", symbol);
    }
  })();
  EdgeRuntime.waitUntil(job);
  return json({ status: "running", symbol }, 202);
});
