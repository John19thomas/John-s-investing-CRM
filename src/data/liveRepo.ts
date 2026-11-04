import { FunctionsHttpError } from "@supabase/supabase-js";
import { parseRevolutCsv } from "@shared/revolut";
import { supabase } from "@/lib/supabase";
import type {
  CompanyRow,
  DocumentRow,
  HoldingRow,
  NoteRow,
  SnapshotRow,
} from "@/lib/database.types";
import type {
  Company,
  CompanyDocument,
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
  india: ["kite", "kite_mf"],
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
    if (docs.length) await supabase.storage.from(BUCKET).remove(docs.map((d) => d.storage_path));
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

  async uploadDocument(companyId, file) {
    const uid = await userId();
    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${uid}/${companyId}/${Date.now()}-${safe}`;
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
    if (up.error) throw new Error(up.error.message);
    const row = check(
      await supabase
        .from("private_documents")
        .insert({
          company_id: companyId,
          title: file.name.replace(/\.pdf$/i, ""),
          storage_path: path,
          doc_type: "memo",
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
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storagePath, 60 * 10);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};
