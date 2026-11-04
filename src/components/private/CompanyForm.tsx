import { useState } from "react";
import { toast } from "sonner";
import { PillButton } from "@/components/app/primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSaveCompany } from "@/data/hooks";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type Company,
  type CompanyInput,
  type Region,
} from "@/data/types";

const field =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-ink";

function blank(region: Region): CompanyInput {
  return {
    name: "",
    website: null,
    sector: null,
    stage: null,
    round: null,
    status: "watching",
    region,
    thesis: null,
    keyRisks: null,
    keyMetrics: {},
    lastValuation: null,
    valuationCurrency: region === "india" ? "INR" : "USD",
    investedAmount: null,
  };
}

export function CompanyForm({
  open,
  onOpenChange,
  region,
  company,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  region: Region;
  company?: Company | null;
  onSaved?: (c: Company) => void;
}) {
  const save = useSaveCompany();
  const [form, setForm] = useState<CompanyInput>(() => (company ? { ...company } : blank(region)));
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Reset the form whenever the dialog opens for a different company.
  const key = `${open}-${company?.id ?? "new"}-${region}`;
  if (key !== lastKey) {
    setLastKey(key);
    setForm(company ? { ...company } : blank(region));
  }

  const set = <K extends keyof CompanyInput>(k: K, v: CompanyInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const text = (v: string) => (v.trim() === "" ? null : v);
  const num = (v: string) => {
    const n = Number(v.replace(/[,\s]/g, ""));
    return v.trim() === "" || !Number.isFinite(n) ? null : n;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give the company a name");
      return;
    }
    save.mutate(
      { ...form, name: form.name.trim() },
      {
        onSuccess: (c) => {
          toast.success(company ? "Saved" : `${c.name} added`);
          onSaved?.(c);
          onOpenChange(false);
        },
        onError: (err) => toast.error("Couldn't save", { description: err.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-line bg-surface sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">
            {company
              ? `Edit ${company.name}`
              : region === "india"
                ? "Add an India company"
                : "Add a global company"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-[13px] text-ink-2">Company name *</span>
            <input
              className={field}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Website</span>
            <input
              className={field}
              value={form.website ?? ""}
              placeholder="company.com"
              onChange={(e) => set("website", text(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Sector</span>
            <input
              className={field}
              value={form.sector ?? ""}
              placeholder="e.g. Fintech"
              onChange={(e) => set("sector", text(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Stage</span>
            <input
              className={field}
              value={form.stage ?? ""}
              placeholder="Seed, Series A…"
              onChange={(e) => set("stage", text(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Status</span>
            <select
              className={field}
              value={form.status}
              onChange={(e) => set("status", e.target.value as CompanyInput["status"])}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Round</span>
            <input
              className={field}
              value={form.round ?? ""}
              placeholder="$10M Series A"
              onChange={(e) => set("round", text(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Currency</span>
            <select
              className={field}
              value={form.valuationCurrency}
              onChange={(e) => set("valuationCurrency", e.target.value)}
            >
              {["USD", "INR", "EUR", "GBP"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Last valuation</span>
            <input
              className={field}
              inputMode="decimal"
              value={form.lastValuation ?? ""}
              placeholder="e.g. 90000000"
              onChange={(e) => set("lastValuation", num(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">My investment</span>
            <input
              className={field}
              inputMode="decimal"
              value={form.investedAmount ?? ""}
              placeholder="Leave empty if not invested"
              onChange={(e) => set("investedAmount", num(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-[13px] text-ink-2">Thesis</span>
            <textarea
              className={`${field} min-h-24`}
              value={form.thesis ?? ""}
              placeholder="Why this could be big. Leave blank and upload an IC memo to have Claude draft it."
              onChange={(e) => set("thesis", text(e.target.value))}
            />
          </label>
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-[13px] text-ink-2">Key risks</span>
            <textarea
              className={`${field} min-h-20`}
              value={form.keyRisks ?? ""}
              onChange={(e) => set("keyRisks", text(e.target.value))}
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <PillButton variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </PillButton>
            <PillButton type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : company ? "Save changes" : "Add company"}
            </PillButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
