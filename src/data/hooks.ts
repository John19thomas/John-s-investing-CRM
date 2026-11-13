import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepo } from "./RepoContext";
import {
  canSummarize,
  type Company,
  type CompanyInput,
  type CompanyStatus,
  type DocType,
  type PortfolioScope,
  type Region,
  type TradeImport,
} from "./types";

// Query keys are namespaced by mode so demo data never mixes with live data.
export function useHoldings(scope: PortfolioScope) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "holdings", scope],
    queryFn: () => repo.holdings(scope),
  });
}

export function useSnapshots(scope: PortfolioScope) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "snapshots", scope],
    queryFn: () => repo.snapshots(scope),
  });
}

export function useCompanies(region: Region) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "companies", region],
    queryFn: () => repo.companies(region),
  });
}

export function useNotes(companyId: string | null) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "notes", companyId],
    queryFn: () => repo.notes(companyId!),
    enabled: !!companyId,
  });
}

export function useDocuments(companyId: string | null) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "documents", companyId],
    queryFn: () => repo.documents(companyId!),
    enabled: !!companyId,
  });
}

/** Move a company between board columns, updating the board immediately. */
export function useSetCompanyStatus(region: Region) {
  const { repo } = useRepo();
  const qc = useQueryClient();
  const key = [repo.mode, "companies", region];
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CompanyStatus }) =>
      repo.setCompanyStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Company[]>(key);
      qc.setQueryData<Company[]>(key, (cs) =>
        (cs ?? []).map((c) => (c.id === id ? { ...c, status } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [repo.mode, "companies"] }),
  });
}

export function useSaveCompany() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyInput) => repo.saveCompany(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [repo.mode, "companies"] }),
  });
}

export function useDeleteCompany() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [repo.mode, "companies"] }),
  });
}

export function useAddNote(companyId: string) {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => repo.addNote(companyId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [repo.mode, "notes", companyId] });
      qc.invalidateQueries({ queryKey: [repo.mode, "companies"] });
    },
  });
}

export function useDeleteNote(companyId: string) {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [repo.mode, "notes", companyId] }),
  });
}

/** Upload a PDF, then have Claude read it. Two steps so the file shows up immediately. */
export function useUploadDocument(companyId: string) {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: DocType }) => {
      const doc = await repo.uploadDocument(companyId, file, docType);
      qc.invalidateQueries({ queryKey: [repo.mode, "documents", companyId] });
      return canSummarize(file.type, file.name) ? repo.summarizeDocument(doc.id) : doc;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [repo.mode, "documents", companyId] });
      qc.invalidateQueries({ queryKey: [repo.mode, "companies"] });
    },
  });
}

export function useSummarizeDocument(companyId: string) {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => repo.summarizeDocument(docId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [repo.mode, "documents", companyId] });
      qc.invalidateQueries({ queryKey: [repo.mode, "companies"] });
    },
  });
}

export function useKiteSync() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestToken?: string) => repo.syncKite(requestToken),
    onSuccess: (r) => {
      if (r.status === "ok") {
        qc.invalidateQueries({ queryKey: [repo.mode, "holdings", "india"] });
        qc.invalidateQueries({ queryKey: [repo.mode, "snapshots", "india"] });
      }
    },
  });
}

export function useRevolutImport() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csv: string) => repo.commitRevolut(csv),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [repo.mode, "holdings", "revolut"] });
      qc.invalidateQueries({ queryKey: [repo.mode, "transactions", "revolut"] });
      qc.invalidateQueries({ queryKey: [repo.mode, "snapshots", "revolut"] });
    },
  });
}

// ---- company research, financials and trades ----

/** A job counts as running only while recent; edge functions are cut off after a few minutes. */
export function isRunning(status: string, startedAt: string | null) {
  return status === "running" && !!startedAt && Date.now() - Date.parse(startedAt) < 8 * 60_000;
}

export function useProfiles() {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "profiles"],
    queryFn: () => repo.profiles(),
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (p) =>
          isRunning(p.researchStatus, p.researchStartedAt) ||
          isRunning(p.memoStatus, p.memoStartedAt),
      )
        ? 4000
        : false,
  });
}

export function useFinancials(symbol: string | null, researchedAt: string | null) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "financials", symbol, researchedAt],
    queryFn: () => repo.financials(symbol!),
    enabled: !!symbol,
  });
}

export function useTransactions(scope: PortfolioScope) {
  const { repo } = useRepo();
  return useQuery({
    queryKey: [repo.mode, "transactions", scope],
    queryFn: () => repo.transactions(scope),
  });
}

export function useResearchCompany() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { symbol: string; name: string | null; exchange: string | null }) =>
      repo.researchCompany(v.symbol, v.name, v.exchange),
    onSettled: () => qc.invalidateQueries({ queryKey: [repo.mode, "profiles"] }),
  });
}

export function useWriteMemo() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => repo.writeMemo(symbol),
    onSettled: () => qc.invalidateQueries({ queryKey: [repo.mode, "profiles"] }),
  });
}

export function useSetOpeningLots() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: TradeImport[]) => repo.setOpeningLots(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: [repo.mode, "transactions"] }),
  });
}

export function useImportTrades() {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: TradeImport[]) => repo.importTrades(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: [repo.mode, "transactions"] }),
  });
}

/**
 * Live prices: asks the server to re-quote this book's holdings every minute while the page is
 * visible, then reloads the holdings. No-op in demo mode.
 */
export function useLiveQuotes(scope: PortfolioScope) {
  const { repo } = useRepo();
  const qc = useQueryClient();
  return useQuery({
    queryKey: [repo.mode, "quotes", scope],
    queryFn: async () => {
      const r = await repo.refreshQuotes(scope);
      if (r.updated) await qc.invalidateQueries({ queryKey: [repo.mode, "holdings"] });
      return { ...r, at: new Date().toISOString() };
    },
    enabled: repo.mode === "live",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
