import type { RevolutParseResult } from "@shared/revolut";

export type { RevolutParseResult, RevolutPosition } from "@shared/revolut";

export type HoldingSource = "kite" | "kite_mf" | "revolut" | "manual";
export type PortfolioScope = "india" | "revolut";
export type Region = "global" | "india";
/** "watching" is shown as Tracking. */
export type CompanyStatus = "watching" | "invested";

export const STATUS_ORDER: CompanyStatus[] = ["watching", "invested"];
export const STATUS_LABEL: Record<CompanyStatus, string> = {
  watching: "Tracking",
  invested: "Invested",
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
  /** When lastPrice was quoted, and by which source (yahoo, finnhub, kite). */
  priceAt?: string | null;
  priceSource?: string | null;
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
  /** Set when the file lives elsewhere (e.g. Google Drive) rather than in Storage. */
  externalUrl: string | null;
  mimeType: string | null;
};

export type DocType =
  "analysis" | "notes" | "memo" | "deck" | "financials" | "transcript" | "other";
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  analysis: "Analysis",
  notes: "Notes",
  memo: "Memo",
  deck: "Deck",
  financials: "Financials",
  transcript: "Transcript",
  other: "Other",
};

/** Claude reads PDFs and plain-text files; other formats are stored and opened as-is. */
export const canSummarize = (mime: string | null | undefined, name = "") =>
  mime === "application/pdf" ||
  !!mime?.startsWith("text/") ||
  /\.(pdf|txt|md|markdown|csv)$/i.test(name);

export type KiteSyncResult =
  | { status: "ok"; equityCount: number; mfCount: number; syncedAt: string }
  | { status: "needs_login"; loginUrl: string };

export type JobStatus = "idle" | "running" | "done" | "error";

export type Cheatsheet = {
  period: string | null;
  resultsDate: string | null;
  headline: string;
  highlights: string[];
  managementCommentary: string[];
  guidance: string[];
  productLaunches: string[];
  otherUpdates: string[];
};

export type CompanyProfile = {
  symbol: string;
  name: string | null;
  website: string | null;
  oneLiner: string | null;
  description: string | null;
  sector: string | null;
  country: string | null;
  isFund: boolean;
  reportingCurrency: string | null;
  presentation: { title: string | null; url: string | null; date: string | null };
  irUrl: string | null;
  marketCapM: number | null;
  netDebtM: number | null;
  sharesOutM: number | null;
  valuationAsOf: string | null;
  notes: string | null;
  sources: { title: string; url: string }[];
  researchStatus: JobStatus;
  researchError: string | null;
  researchStartedAt: string | null;
  researchedAt: string | null;
  memo: string | null;
  memoStatus: JobStatus;
  memoError: string | null;
  memoStartedAt: string | null;
  memoAt: string | null;
  /** Latest-quarter cheatsheet from results, call and investor presentation. */
  cheatsheet?: Cheatsheet | null;
  /** ARR, only where the company discloses it. Millions of the reporting currency. */
  arr?: { valueM: number; label: string | null; asOf: string | null } | null;
  nextEarningsDate?: string | null;
  /** Demo mode: figures are illustrative, not real company data. */
  illustrative?: boolean;
};

/** One reporting period, money values in millions of the reporting currency. */
export type FinancialPeriod = {
  label: string;
  periodEnd: string;
  type: "annual" | "ttm" | "quarter";
  currency: string;
  revenue: number | null;
  revenueYoyPct: number | null;
  grossProfit: number | null;
  grossMarginPct: number | null;
  ebitda: number | null;
  ebitdaMarginPct: number | null;
  cfo: number | null;
  capex: number | null;
  fcf: number | null;
  netIncome: number | null;
  sourceUrl: string | null;
};

export type Txn = {
  source: HoldingSource;
  symbol: string;
  date: string;
  side: "buy" | "sell" | "dividend" | "split";
  quantity: number;
  price: number;
  amount: number | null;
  currency: string;
  /** True for an opening lot entered by hand (approximate purchase date), not a broker trade. */
  estimated?: boolean;
};

export type TradeImport = {
  source: HoldingSource;
  symbol: string;
  date: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  currency: string;
  externalId: string;
};

export interface Repo {
  mode: "live" | "demo";
  holdings(scope: PortfolioScope): Promise<Holding[]>;
  snapshots(scope: PortfolioScope): Promise<Snapshot[]>;
  syncKite(requestToken?: string): Promise<KiteSyncResult>;
  previewRevolut(csv: string): Promise<RevolutParseResult>;
  commitRevolut(csv: string): Promise<{ saved: number }>;
  companies(region: Region): Promise<Company[]>;
  saveCompany(input: CompanyInput): Promise<Company>;
  /** Move a private company between Tracking and Invested. */
  setCompanyStatus(id: string, status: CompanyStatus): Promise<void>;
  deleteCompany(id: string): Promise<void>;
  notes(companyId: string): Promise<Note[]>;
  addNote(companyId: string, body: string): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  documents(companyId: string): Promise<CompanyDocument[]>;
  uploadDocument(companyId: string, file: File, docType: DocType): Promise<CompanyDocument>;
  summarizeDocument(id: string): Promise<CompanyDocument>;
  documentUrl(doc: CompanyDocument): Promise<string | null>;
  profiles(): Promise<CompanyProfile[]>;
  financials(symbol: string): Promise<FinancialPeriod[]>;
  transactions(scope: PortfolioScope): Promise<Txn[]>;
  importTrades(rows: TradeImport[]): Promise<{ saved: number }>;
  /** Replace hand-entered opening lots (externalId "opening:SYMBOL") for the given symbols. */
  setOpeningLots(rows: TradeImport[]): Promise<void>;
  researchCompany(symbol: string, name: string | null, exchange: string | null): Promise<void>;
  writeMemo(symbol: string): Promise<void>;
  /** Fetch current market prices for holdings (live mode); returns how many were updated. */
  refreshQuotes(scope: PortfolioScope): Promise<{ updated: number; failed: string[] }>;
  /** Ask the dashboard chatbot a question about the user's own data. */
  ask(
    message: string,
    conversationId: string | null,
  ): Promise<{ reply: string; conversationId: string }>;
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
