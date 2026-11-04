import { FunctionsHttpError } from "@supabase/supabase-js";
import { parseRevolutCsv } from "@shared/revolut";
import { supabase } from "@/lib/supabase";
import type {
  CompanyRow,
  DocumentRow,
  FinancialRow,
  HoldingRow,
  NoteRow,
  ProfileRow,
  SnapshotRow,
  TxnRow,
} from "@/lib/database.types";
import type {
  Company,
  CompanyDocument,
  CompanyProfile,
  FinancialPeriod,
  JobStatus,
  Txn,
  CompanyStatus,
  Holding,
  HoldingSource,
  Note,
  Region,
  Repo,
  Snapshot,
} from "./types";

const BUCKET = "private-docs";

const SOURCES: Record<"india" | "revolut", HoldingSource[]> = {
  india: ["kite"],
  revolut: ["revolut"],
};

function toHolding(r: HoldingRow): Holding {
  return {
    id: r.id,
    source: r.source as HoldingSource,
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    quantity: Number(r.quantity),
    avgPrice: Number(r.avg_price ?? 0),
    lastPrice: r.last_price == null ? null : Number(r.last_price),
    dayChangePct: r.day_change_pct == null ? null : Number(r.day_change_pct),
    currency: r.currency,
    snapshotAt: r.snapshot_at,
  };
}

function toSnapshot(r: SnapshotRow): Snapshot {
  return {
    date: r.snapshot_date,
    source: r.source,
    invested: Number(r.invested_value ?? 0),
    current: Number(r.current_value ?? 0),
    currency: r.currency,
  };
}

function toCompany(r: CompanyRow): Company {
  const metrics: Record<string, string> = {};
  if (r.key_metrics && typeof r.key_metrics === "object" && !Array.isArray(r.key_metrics)) {
    for (const [k, v] of Object.entries(r.key_metrics)) if (v != null) metrics[k] = String(v);
  }
  return {
    id: r.id,
    name: r.name,
    website: r.website,
    sector: r.sector,
    stage: r.stage,
    round: r.round,
    status: r.status as CompanyStatus,
    region: r.region as Region,
    thesis: r.thesis,
    keyRisks: r.key_risks,
    keyMetrics: metrics,
    lastValuation: r.last_valuation == null ? null : Number(r.last_valuation),
    valuationCurrency: r.valuation_currency ?? "USD",
    investedAmount: r.invested_amount == null ? null : Number(r.invested_amount),
    updatedAt: r.updated_at,
  };
}

const toNote = (r: NoteRow): Note => ({
  id: r.id,
  companyId: r.company_id,
  body: r.body,
  createdAt: r.created_at,
});

const toDoc = (r: DocumentRow): CompanyDocument => ({
  id: r.id,
  companyId: r.company_id ?? "",
  title: r.title,
  docType: r.doc_type,
  storagePath: r.storage_path,
  summary: r.summary,
  keyTakeaways: r.key_takeaways,
  uploadedAt: r.uploaded_at,
  externalUrl: r.external_url,
  mimeType: r.mime_type,
});

function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data == null) throw new Error("No data returned");
  return res.data as NonNullable<T>;
}

function ok(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}

/** Calls an edge function and returns its JSON, surfacing the function's own error message. */
async function invoke<T>(name: string, body: unknown): Promise<{ status: number; data: T }> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let payload: Record<string, unknown> = {};
      try {
        payload = await res.json();
      } catch {
        /* not JSON */
      }
      if (res.status === 401 && payload["needs_login"]) return { status: 401, data: payload as T };
      const msg = [payload["error"], payload["detail"]].filter(Boolean).join(": ");
      throw new Error(msg || `${name} failed (${res.status})`);
    }
    throw new Error(error.message);
  }
  return { status: 200, data: data as T };
}

async function userId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You're signed out. Please sign in again.");
  return data.user.id;
}

const n = (v: number | null) => (v == null ? null : Number(v));

export function toProfile(r: ProfileRow): CompanyProfile {
  const sources = Array.isArray(r.sources)
    ? (r.sources as { title?: unknown; url?: unknown }[])
        .filter((x) => x && typeof x.url === "string")
        .map((x) => ({ title: String(x.title ?? x.url), url: String(x.url) }))
    : [];
  return {
    symbol: r.symbol,
    name: r.name,
    website: r.website,
    oneLiner: r.one_liner,
    description: r.description,
    sector: r.sector,
    country: r.country,
    isFund: r.is_fund,
    reportingCurrency: r.reporting_currency,
    presentation: {
      title: r.investor_presentation_title,
      url: r.investor_presentation_url,
      date: r.investor_presentation_date,
    },
    irUrl: r.ir_url,
    marketCapM: n(r.market_cap_millions),
    netDebtM: n(r.net_debt_millions),
    sharesOutM: n(r.shares_outstanding_millions),
    valuationAsOf: r.valuation_as_of,
    notes: r.research_notes,
    sources,
    researchStatus: r.research_status as JobStatus,
    researchError: r.research_error,
    researchStartedAt: r.research_started_at,
    researchedAt: r.researched_at,
    memo: r.memo_md,
    memoStatus: r.memo_status as JobStatus,
    memoError: r.memo_error,
    memoStartedAt: r.memo_started_at,
    memoAt: r.memo_at,
  };
}

const toPeriod = (r: FinancialRow): FinancialPeriod => ({
  label: r.period_label,
  periodEnd: r.period_end,
  type: r.period_type as FinancialPeriod["type"],
  currency: r.currency,
  revenue: n(r.revenue),
  revenueYoyPct: n(r.revenue_yoy_pct),
  grossProfit: n(r.gross_profit),
  grossMarginPct: n(r.gross_margin_pct),
  ebitda: n(r.ebitda),
  ebitdaMarginPct: n(r.ebitda_margin_pct),
  cfo: n(r.cfo),
  capex: n(r.capex),
  fcf: n(r.free_cash_flow),
  netIncome: n(r.net_income),
  sourceUrl: r.source_url,
});

const toTxn = (r: TxnRow): Txn => ({
  source: r.source as HoldingSource,
  symbol: r.symbol,
  date: r.trade_date,
  side: r.side as Txn["side"],
  quantity: Number(r.quantity),
  price: Number(r.price),
  amount: n(r.amount),
  currency: r.currency,
});

export const liveRepo: Repo = {
  mode: "live",

  async holdings(scope) {
    const rows = check(
      await supabase.from("holdings").select("*").in("source", SOURCES[scope]).order("symbol"),
    );
    return rows.map(toHolding);
  },

  async snapshots(scope) {
    const rows = check(
      await supabase
        .from("portfolio_snapshots")
        .select("*")
        .in("source", SOURCES[scope])
        .order("snapshot_date"),
    );
    // Merge sources (Kite equity + Kite MF) into one series per day.
    const byDate = new Map<string, Snapshot>();
    for (const s of rows.map(toSnapshot)) {
      const prev = byDate.get(s.date);
      if (prev) {
        prev.invested += s.invested;
        prev.current += s.current;
      } else byDate.set(s.date, { ...s, source: scope });
    }
    return [...byDate.values()];
  },

  async syncKite(requestToken) {
    const { status, data } = await invoke<Record<string, unknown>>(
      "kite-sync",
      requestToken ? { request_token: requestToken } : {},
    );
    if (status === 401) return { status: "needs_login", loginUrl: String(data["login_url"]) };
    return {
      status: "ok",
      equityCount: Number(data["equity_count"] ?? 0),
      mfCount: Number(data["mf_count"] ?? 0),
      syncedAt: String(data["synced_at"] ?? new Date().toISOString()),
    };
  },

  async previewRevolut(csv) {
    return parseRevolutCsv(csv);
  },

  async commitRevolut(csv) {
    const { data } = await invoke<{ saved: number }>("revolut-import", { csv, commit: true });
    return { saved: data.saved };
  },

  async companies(region: Region) {
    const rows = check(
      await supabase
        .from("private_companies")
        .select("*")
        .eq("region", region)
        .order("updated_at", { ascending: false }),
    );
    return rows.map(toCompany);
  },

  async saveCompany(input) {
    const row = {
      name: input.name,
      website: input.website,
      sector: input.sector,
      stage: input.stage,
      round: input.round,
      status: input.status,
      region: input.region,
      thesis: input.thesis,
      key_risks: input.keyRisks,
      key_metrics: input.keyMetrics,
      last_valuation: input.lastValuation,
      valuation_currency: input.valuationCurrency,
      invested_amount: input.investedAmount,
      updated_at: new Date().toISOString(),
    };
    const res = input.id
      ? await supabase.from("private_companies").update(row).eq("id", input.id).select("*").single()
      : await supabase.from("private_companies").insert(row).select("*").single();
    return toCompany(check(res));
  },

  async deleteCompany(id) {
    const docs = check(
      await supabase.from("private_documents").select("storage_path").eq("company_id", id),
    );
    const stored = docs.map((d) => d.storage_path).filter((p) => p && !p.startsWith("drive:"));
    if (stored.length) await supabase.storage.from(BUCKET).remove(stored);
    ok(await supabase.from("private_documents").delete().eq("company_id", id));
    ok(await supabase.from("private_companies").delete().eq("id", id));
  },

  async notes(companyId) {
    const rows = check(
      await supabase
        .from("company_notes")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
    );
    return rows.map(toNote);
  },

  async addNote(companyId, body) {
    const row = check(
      await supabase
        .from("company_notes")
        .insert({ company_id: companyId, body })
        .select("*")
        .single(),
    );
    await supabase
      .from("private_companies")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", companyId);
    return toNote(row);
  },

  async deleteNote(id) {
    ok(await supabase.from("company_notes").delete().eq("id", id));
  },

  async documents(companyId) {
    const rows = check(
      await supabase
        .from("private_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("uploaded_at", { ascending: false }),
    );
    return rows.map(toDoc);
  },

  async uploadDocument(companyId, file, docType) {
    const uid = await userId();
    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${uid}/${companyId}/${Date.now()}-${safe}`;
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (up.error) throw new Error(up.error.message);
    const row = check(
      await supabase
        .from("private_documents")
        .insert({
          company_id: companyId,
          title: file.name.replace(/\.[a-z0-9]+$/i, ""),
          storage_path: path,
          doc_type: docType,
          mime_type: file.type || null,
        })
        .select("*")
        .single(),
    );
    return toDoc(row);
  },

  async summarizeDocument(id) {
    await invoke("summarize-memo", { document_id: id, apply_to_company: true });
    const row = check(await supabase.from("private_documents").select("*").eq("id", id).single());
    return toDoc(row);
  },

  async documentUrl(doc) {
    if (doc.externalUrl) return doc.externalUrl;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storagePath, 60 * 10);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async profiles() {
    const rows = check(await supabase.from("company_profiles").select("*"));
    return rows.map(toProfile);
  },

  async financials(symbol) {
    const rows = check(
      await supabase.from("financials").select("*").eq("symbol", symbol).order("period_end"),
    );
    return rows.map(toPeriod);
  },

  async transactions(scope) {
    const rows: TxnRow[] = [];
    // Page through in case the ledger is long.
    for (let from = 0; ; from += 1000) {
      const page = check(
        await supabase
          .from("transactions")
          .select("*")
          .in("source", SOURCES[scope])
          .order("trade_date")
          .range(from, from + 999),
      );
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows.map(toTxn);
  },

  async importTrades(rows) {
    let saved = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => ({
        source: r.source,
        symbol: r.symbol,
        trade_date: r.date,
        side: r.side,
        quantity: r.quantity,
        price: r.price,
        currency: r.currency,
        external_id: r.externalId,
      }));
      ok(
        await supabase
          .from("transactions")
          .upsert(chunk, { onConflict: "user_id,source,external_id", ignoreDuplicates: true }),
      );
      saved += chunk.length;
    }
    return { saved };
  },

  async researchCompany(symbol, name, exchange) {
    await invoke("research-company", { symbol, name, exchange });
  },

  async writeMemo(symbol) {
    await invoke("write-memo", { symbol });
  },
};
