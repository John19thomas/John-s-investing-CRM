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
      company_notes: Table<NoteRow, WithOptional<NoteRow, "id" | "created_at" | "user_id">>;
      private_documents: Table<
        DocumentRow,
        WithOptional<
          DocumentRow,
          "id" | "uploaded_at" | "user_id" | "company_id" | "doc_type" | "key_takeaways" | "summary"
        >
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
