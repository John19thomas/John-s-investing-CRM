// summarize-memo: reads an uploaded IC memo / deck PDF with Claude and fills in its summary.
// POST { document_id: string, apply_to_company?: boolean }
//  - Downloads the file from the private-docs bucket as the signed-in user (RLS applies).
//  - Saves summary + key_takeaways on private_documents.
//  - apply_to_company: also fills the company's thesis / key_risks / key_metrics, but only
//    where those fields are currently empty (never overwrites John's own writing).
// Secrets: ANTHROPIC_API_KEY (required), MEMO_MODEL (optional, default claude-opus-5-5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

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

const MAX_PDF_BYTES = 25 * 1024 * 1024;

const SYSTEM = `You are an investment analyst reading a private-markets document (IC memo, pitch deck, financials or call transcript) for John's personal investing CRM.
Extract what an investment committee would need, faithfully. Never invent numbers: if a figure is not in the document, leave it out.
Always state the period and currency/unit next to any metric. Separate the company's claims from the memo author's own view where the document makes that distinction.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "key_takeaways", "thesis", "key_risks", "key_metrics", "doc_type"],
  properties: {
    summary: { type: "string", description: "3-5 sentence summary of the document." },
    key_takeaways: {
      type: "array",
      items: { type: "string" },
      description: "5-8 bullet takeaways.",
    },
    thesis: {
      type: "string",
      description:
        "The investment thesis as argued in the document, as plain text paragraphs separated by a blank line. First paragraph: one sentence stating the thesis. Then up to three paragraphs that each start with a label and a colon: 'Why it matters: …', 'Why now: …', 'What has to go right: …'. Two to three sentences each, with the document's own numbers. Omit a paragraph the document does not support.",
    },
    key_risks: { type: "array", items: { type: "string" } },
    key_metrics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "value", "period"],
        properties: {
          name: { type: "string" },
          value: { type: "string", description: "Value with currency/unit, e.g. 'USD 12.4m'." },
          period: {
            type: "string",
            description: "e.g. 'FY24', 'Q2 2025', 'as of Mar 2025', or ''.",
          },
        },
      },
    },
    doc_type: {
      type: "string",
      enum: ["memo", "analysis", "notes", "deck", "financials", "transcript", "other"],
    },
  },
} as const;

type Extract = {
  summary: string;
  key_takeaways: string[];
  thesis: string;
  key_risks: string[];
  key_metrics: { name: string; value: string; period: string }[];
  doc_type: "memo" | "analysis" | "notes" | "deck" | "financials" | "transcript" | "other";
};

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

  let body: { document_id?: string; apply_to_company?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  if (!body.document_id) return json({ error: "document_id is required" }, 400);

  const { data: doc, error: docErr } = await db
    .from("private_documents")
    .select("id, company_id, title, storage_path, doc_type, mime_type, external_url")
    .eq("id", body.document_id)
    .maybeSingle();
  if (docErr || !doc) return json({ error: "Document not found" }, 404);

  if (!doc.storage_path || doc.storage_path.startsWith("drive:"))
    return json(
      { error: "This document is linked from Google Drive, so there is no copy to read." },
      422,
    );

  const { data: file, error: dlErr } = await db.storage
    .from("private-docs")
    .download(doc.storage_path);
  if (dlErr || !file)
    return json({ error: "Couldn't download the file", detail: dlErr?.message }, 404);
  if (file.size > MAX_PDF_BYTES) return json({ error: "File is larger than 25 MB" }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  const isText =
    (doc.mime_type ?? "").startsWith("text/") || /\.(txt|md|markdown|csv)$/i.test(doc.storage_path);
  if (!isPdf && !isText)
    return json(
      { error: "Claude can read PDF and text files. This file is stored but not summarised." },
      415,
    );
  const source = isPdf
    ? { type: "base64" as const, media_type: "application/pdf" as const, data: encodeBase64(bytes) }
    : {
        type: "text" as const,
        media_type: "text/plain" as const,
        data: new TextDecoder().decode(bytes),
      };

  const { data: company } = await db
    .from("private_companies")
    .select("id, name, thesis, key_risks, key_metrics")
    .eq("id", doc.company_id)
    .maybeSingle();

  const client = new Anthropic();
  let extract: Extract;
  try {
    // Non-streaming: Supabase's CPU-time limit is hit when parsing a long streamed response.
    const msg = await client.beta.messages.create({
      model: Deno.env.get("MEMO_MODEL") ?? "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              title: doc.title ?? undefined,
              source,
            },
            {
              type: "text",
              text: `Company: ${company?.name ?? "unknown"}. Extract the fields for this document.`,
            },
          ],
        },
      ],
    });
    if (msg.stop_reason === "refusal")
      return json({ error: "Claude declined to read this document" }, 422);
    if (msg.stop_reason === "max_tokens")
      return json({ error: "Response was cut off; try a shorter document" }, 502);
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    extract = JSON.parse(text) as Extract;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      return json({ error: "Claude is rate limited, try again shortly" }, 429);
    if (e instanceof Anthropic.APIError)
      return json({ error: "Claude API error", detail: e.message }, 502);
    return json({ error: "Couldn't read the document", detail: (e as Error).message }, 500);
  }

  const bullets = (xs: string[]) => xs.map((x) => `• ${x}`).join("\n");
  const upd = await db
    .from("private_documents")
    .update({
      summary: extract.summary,
      key_takeaways: bullets(extract.key_takeaways),
      // Keep the type the user chose; only classify documents that have none.
      ...(doc.doc_type ? {} : { doc_type: extract.doc_type }),
    })
    .eq("id", doc.id);
  if (upd.error)
    return json({ error: "Saving the summary failed", detail: upd.error.message }, 500);

  const companyUpdates: Record<string, unknown> = {};
  if (body.apply_to_company && company) {
    if (!company.thesis?.trim() && extract.thesis) companyUpdates.thesis = extract.thesis;
    if (!company.key_risks?.trim() && extract.key_risks.length)
      companyUpdates.key_risks = bullets(extract.key_risks);
    const hasMetrics = company.key_metrics && Object.keys(company.key_metrics).length > 0;
    if (!hasMetrics && extract.key_metrics.length) {
      companyUpdates.key_metrics = Object.fromEntries(
        extract.key_metrics.map((m) => [m.name, m.period ? `${m.value} (${m.period})` : m.value]),
      );
    }
    if (Object.keys(companyUpdates).length) {
      const cu = await db.from("private_companies").update(companyUpdates).eq("id", company.id);
      if (cu.error)
        return json({ error: "Saving company fields failed", detail: cu.error.message }, 500);
    }
  }

  return json({
    ok: true,
    document_id: doc.id,
    ...extract,
    company_fields_filled: Object.keys(companyUpdates),
  });
});
