import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepo } from "./RepoContext";
import type { CompanyInput, PortfolioScope, Region } from "./types";

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
    mutationFn: async (file: File) => {
      const doc = await repo.uploadDocument(companyId, file);
      qc.invalidateQueries({ queryKey: [repo.mode, "documents", companyId] });
      return repo.summarizeDocument(doc.id);
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
      qc.invalidateQueries({ queryKey: [repo.mode, "snapshots", "revolut"] });
    },
  });
}
