// Types for the tables this app uses in the investing-dashboard Supabase project.
// Generated from the live schema (Supabase type generator) and trimmed to the tables the UI reads.
// Regenerate after schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type HoldingRow = {
  avg_price: number | null;
  close_price: number | null;
  created_at: string;
  currency: string;
  day_change_pct: number | null;
  exchange: string | null;
  id: string;
  isin: string | null;
  last_price: number | null;
  name: string | null;
  pnl: number | null;
  price_at?: string | null;
  price_source?: string | null;
  quantity: number;
  sector: string | null;
  snapshot_at: string;
  source: string;
  symbol: string;
  tags: string[] | null;
  user_id: string;
};

export type SnapshotRow = {
  created_at: string;
  currency: string;
  current_value: number | null;
  id: string;
  invested_value: number | null;
  snapshot_date: string;
  source: string;
  user_id: string;
};

export type CompanyRow = {
  context: string | null;
  created_at: string;
  id: string;
  invested_amount: number | null;
  key_metrics: Json | null;
  key_risks: string | null;
  last_valuation: number | null;
  name: string;
  region: string;
  round: string | null;
  sector: string | null;
  stage: string | null;
  status: string;
  tags: string[] | null;
  thesis: string | null;
  updated_at: string;
  user_id: string;
  valuation_currency: string | null;
  website: string | null;
};

export type NoteRow = {
  body: string;
  company_id: string;
  created_at: string;
  id: string;
  user_id: string;
};

export type DocumentRow = {
  company_id: string | null;
  doc_type: string | null;
  id: string;
  key_takeaways: string | null;
  storage_path: string;
  summary: string | null;
  title: string;
  uploaded_at: string;
  user_id: string;
  external_url: string | null;
  mime_type: string | null;
};

export type ProfileRow = {
  id: string;
  user_id: string;
  symbol: string;
  name: string | null;
  website: string | null;
  one_liner: string | null;
  description: string | null;
  sector: string | null;
  country: string | null;
  is_fund: boolean;
  reporting_currency: string | null;
  investor_presentation_title: string | null;
  investor_presentation_url: string | null;
  investor_presentation_date: string | null;
  ir_url: string | null;
  market_cap_millions: number | null;
  net_debt_millions: number | null;
  shares_outstanding_millions: number | null;
  valuation_as_of: string | null;
  research_notes: string | null;
  sources: Json;
  research_status: string;
  research_error: string | null;
  research_started_at: string | null;
  researched_at: string | null;
  memo_md: string | null;
  memo_status: string;
  memo_error: string | null;
  memo_started_at: string | null;
  memo_at: string | null;
  cheatsheet?: Json | null;
  arr_millions?: number | null;
  arr_label?: string | null;
  arr_as_of?: string | null;
  next_earnings_date?: string | null;
  updated_at: string;
};

export type FinancialRow = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string | null;
  period_label: string;
  period_end: string;
  period_type: string;
  is_estimate: boolean;
  currency: string;
  unit: string;
  revenue: number | null;
  gross_profit: number | null;
  gross_margin_pct: number | null;
  ebitda: number | null;
  ebitda_margin_pct: number | null;
  free_cash_flow: number | null;
  revenue_yoy_pct: number | null;
  ebitda_yoy_pct: number | null;
  cfo: number | null;
  capex: number | null;
  net_income: number | null;
  notes: string | null;
  source_url: string | null;
  reported_at: string | null;
  created_at: string;
};

export type TxnRow = {
  id: string;
  user_id: string;
  source: string;
  symbol: string;
  trade_date: string;
  side: string;
  quantity: number;
  price: number;
  amount: number | null;
  currency: string;
  external_id: string;
  created_at: string;
};

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      holdings: Table<
        HoldingRow,
        WithOptional<HoldingRow, "id" | "created_at" | "user_id" | "snapshot_at">
      >;
      portfolio_snapshots: Table<
        SnapshotRow,
        WithOptional<SnapshotRow, "id" | "created_at" | "user_id" | "snapshot_date">
      >;
      private_companies: Table<
        CompanyRow,
        WithOptional<
          CompanyRow,
          | "id"
          | "created_at"
          | "updated_at"
          | "user_id"
          | "context"
          | "invested_amount"
          | "key_metrics"
          | "key_risks"
          | "last_valuation"
          | "region"
          | "round"
          | "sector"
          | "stage"
          | "status"
          | "tags"
          | "thesis"
          | "valuation_currency"
          | "website"
        >
      >;
      company_profiles: Table<ProfileRow, Partial<ProfileRow> & { symbol: string }>;
      financials: Table<
        FinancialRow,
        Partial<FinancialRow> & { symbol: string; period_end: string; period_label: string }
      >;
      transactions: Table<TxnRow, WithOptional<TxnRow, "id" | "user_id" | "created_at" | "amount">>;
      company_notes: Table<NoteRow, WithOptional<NoteRow, "id" | "created_at" | "user_id">>;
      private_documents: Table<
        DocumentRow,
        WithOptional<
          DocumentRow,
          | "id"
          | "uploaded_at"
          | "user_id"
          | "company_id"
          | "doc_type"
          | "key_takeaways"
          | "summary"
          | "external_url"
          | "mime_type"
        >
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
