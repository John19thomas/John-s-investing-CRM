import type { RevolutParseResult } from "@shared/revolut";

export type { RevolutParseResult, RevolutPosition } from "@shared/revolut";

export type HoldingSource = "kite" | "kite_mf" | "revolut" | "manual";
export type PortfolioScope = "india" | "revolut";
export type Region = "global" | "india";
export type CompanyStatus = "watching" | "evaluated" | "invested" | "passed";

export const STATUS_ORDER: CompanyStatus[] = ["watching", "evaluated", "invested", "passed"];
export const STATUS_LABEL: Record<CompanyStatus, string> = {
  watching: "Watching",
  evaluated: "Evaluating",
  invested: "Invested",
  passed: "Passed",
};

export type Holding = {
  id: string;
  source: HoldingSource;
  symbol: string;
  name: string | null;
  exchange: string | null;
  quantity: number;
  avgPrice: number;
  lastPrice: number | null;
  dayChangePct: number | null;
  currency: string;
  snapshotAt: string;
};

export type Snapshot = {
  date: string; // YYYY-MM-DD
  source: string;
  invested: number;
  current: number;
  currency: string;
};

export type Company = {
  id: string;
  name: string;
  website: string | null;
  sector: string | null;
  stage: string | null;
  round: string | null;
  status: CompanyStatus;
  region: Region;
  thesis: string | null;
  keyRisks: string | null;
  keyMetrics: Record<string, string>;
  lastValuation: number | null;
  valuationCurrency: string;
  investedAmount: number | null;
  updatedAt: string;
};

export type CompanyInput = Omit<Company, "id" | "updatedAt"> & { id?: string };

export type Note = { id: string; companyId: string; body: string; createdAt: string };

export type CompanyDocument = {
  id: string;
  companyId: string;
  title: string;
  docType: string | null;
  storagePath: string;
  summary: string | null;
  keyTakeaways: string | null;
  uploadedAt: string;
};

export type KiteSyncResult =
  | { status: "ok"; equityCount: number; mfCount: number; syncedAt: string }
  | { status: "needs_login"; loginUrl: string };

export interface Repo {
  mode: "live" | "demo";
  holdings(scope: PortfolioScope): Promise<Holding[]>;
  snapshots(scope: PortfolioScope): Promise<Snapshot[]>;
  syncKite(requestToken?: string): Promise<KiteSyncResult>;
  previewRevolut(csv: string): Promise<RevolutParseResult>;
  commitRevolut(csv: string): Promise<{ saved: number }>;
  companies(region: Region): Promise<Company[]>;
  saveCompany(input: CompanyInput): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  notes(companyId: string): Promise<Note[]>;
  addNote(companyId: string, body: string): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  documents(companyId: string): Promise<CompanyDocument[]>;
  uploadDocument(companyId: string, file: File): Promise<CompanyDocument>;
  summarizeDocument(id: string): Promise<CompanyDocument>;
  documentUrl(doc: CompanyDocument): Promise<string | null>;
}

// ---- derived figures ----
export const invested = (h: Holding) => h.quantity * h.avgPrice;
export const marketValue = (h: Holding) => (h.lastPrice == null ? null : h.quantity * h.lastPrice);
export const pnl = (h: Holding) => {
  const v = marketValue(h);
  return v == null ? null : v - invested(h);
};
export const pnlPct = (h: Holding) => {
  const p = pnl(h);
  const i = invested(h);
  return p == null || i === 0 ? null : (p / i) * 100;
};
