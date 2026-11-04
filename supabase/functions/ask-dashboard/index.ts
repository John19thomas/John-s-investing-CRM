// ask-dashboard: in-app chatbot for Investing Dashboard.
// POST { message: string, conversation_id?: string } -> { reply, conversation_id }
// Reads the signed-in user's own data (RLS-scoped) and answers with Claude.
// Secrets: ANTHROPIC_API_KEY (required), CHAT_MODEL (optional, default claude-sonnet-5-5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const SYSTEM = `You are the analyst built into John's Investing Dashboard, a read-only personal portfolio app.
Answer using the PORTFOLIO DATA provided. Style: IC-grade, metrics-first, concise. Lead with the answer, then the numbers.
Rules:
- Distinguish reported figures from estimates, and cite the period (e.g. Q2 FY27) and currency/unit for every number.
- If the data needed is not in PORTFOLIO DATA, say so plainly; you may add general knowledge but label it as such and note it may be out of date.
- Never invent figures. Never give buy/sell instructions; frame views as considerations, not advice.
- For private companies, draw on thesis, risks, metrics and document takeaways to help John revise and articulate his view.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "ANTHROPIC_API_KEY secret not set" }, 500);

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

  const [holdings, financials, announcements, analyses, earnings, companies, docs, history] =
    await Promise.all([
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
    ]);

  const context = {
    today: new Date().toISOString().slice(0, 10),
    public_holdings: holdings.data ?? [],
    financials: financials.data ?? [],
    announcements: announcements.data ?? [],
    recent_analyst_notes: analyses.data ?? [],
    earnings_calendar: earnings.data ?? [],
    private_companies: companies.data ?? [],
    private_documents: docs.data ?? [],
  };

  const messages = [
    ...(history.data ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("CHAT_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: 1500,
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: "PORTFOLIO DATA (JSON):\n" + JSON.stringify(context) },
      ],
      messages,
    }),
  });
  const out = await r.json();
  if (!r.ok) return json({ error: "Claude API error", detail: out?.error?.message }, 502);
  const reply = (out.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");

  await db.from("chat_messages").insert([
    { user_id: user.id, conversation_id, role: "user", content: message },
    { user_id: user.id, conversation_id, role: "assistant", content: reply },
  ]);
  return json({ reply, conversation_id });
});
