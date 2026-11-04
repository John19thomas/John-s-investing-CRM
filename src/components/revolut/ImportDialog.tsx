import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PillButton } from "@/components/app/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRevolutImport } from "@/data/hooks";
import { useRepo } from "@/data/RepoContext";
import type { RevolutParseResult } from "@/data/types";
import { money, qty } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE = `Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
2025-01-06T14:30:00Z,NVDA,BUY - MARKET,40,USD 128.40,USD 5136,USD,1
2025-02-03T14:30:00Z,MSFT,BUY - MARKET,12,USD 410.10,USD 4921.20,USD,1
2025-03-10T14:30:00Z,ASML,BUY - LIMIT,5,USD 690.00,USD 3450,USD,1
2025-05-12T14:30:00Z,NVDA,SELL - MARKET,10,USD 132.00,USD 1320,USD,1
2025-06-02T14:30:00Z,VOO,BUY - MARKET,8,USD 500.00,USD 4000,USD,1`;

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { repo } = useRepo();
  const commit = useRevolutImport();
  const input = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<RevolutParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setCsv(null);
    setPreview(null);
    setError(null);
    setFileName("");
  };

  const load = async (text: string, name: string) => {
    setError(null);
    setFileName(name);
    try {
      const p = await repo.previewRevolut(text);
      setCsv(text);
      setPreview(p);
    } catch (e) {
      setPreview(null);
      setError((e as Error).message);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError("That file is larger than 5 MB.");
    await load(await f.text(), f.name);
  };

  const confirm = () => {
    if (!csv) return;
    commit.mutate(csv, {
      onSuccess: (r) => {
        toast.success(`Imported ${r.saved} positions from Revolut`);
        reset();
        onOpenChange(false);
      },
      onError: (e) => toast.error("Import failed", { description: e.message }),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-line bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Import from Revolut</DialogTitle>
          <DialogDescription className="text-ink-2">
            Upload your Revolut stocks <strong>account statement</strong> (CSV). Positions and
            average costs are rebuilt from your trades. Importing replaces your previous Revolut
            holdings, nothing else.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void onFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex w-full flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center transition-colors",
                dragging ? "border-ink bg-paper-2" : "border-line hover:bg-paper-2",
              )}
            >
              <span className="grid size-12 place-items-center rounded-sm bg-ink text-paper">
                <Upload className="size-5" aria-hidden />
              </span>
              <span className="mt-4 font-medium">Drop your CSV here, or click to choose</span>
              <span className="mt-1 text-[13px] text-ink-3">
                Revolut app → Invest → ··· → Documents → Account statement → Excel/CSV
              </span>
            </button>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-loss/8 px-4 py-3 text-sm text-loss">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
              </p>
            )}
            {repo.mode === "demo" && (
              <button
                type="button"
                className="text-left text-sm text-ink-2 underline underline-offset-2"
                onClick={() => void load(SAMPLE, "sample-revolut-statement.csv")}
              >
                No file handy? Try a sample statement
              </button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-sm bg-paper-2 px-4 py-3 text-sm">
              <FileSpreadsheet className="size-5 text-ink-2" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{fileName}</div>
                <div className="text-ink-3">
                  {preview.format === "transactions" ? "Trading statement" : "Holdings file"} ·{" "}
                  {preview.rows_read} rows read · {preview.positions.length} open positions
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-ink-2 underline underline-offset-2"
              >
                Change
              </button>
            </div>

            {preview.warnings.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-series-2/10 px-4 py-3 text-[13px] text-ink-2">
                {preview.warnings.slice(0, 5).map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            <div className="max-h-72 overflow-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-[12px] text-ink-3">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 text-left font-medium">Ticker</th>
                    <th className="px-4 py-2.5 text-right font-medium">Shares</th>
                    <th className="px-4 py-2.5 text-right font-medium">Avg cost</th>
                    <th className="px-4 py-2.5 text-right font-medium">Cost basis</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {preview.positions.map((p) => (
                    <tr key={p.symbol} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-2.5 font-semibold">{p.symbol}</td>
                      <td className="px-4 py-2.5 text-right">{qty(p.quantity)}</td>
                      <td className="px-4 py-2.5 text-right">{money(p.avg_price, p.currency)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {money(p.avg_price * p.quantity, p.currency, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <PillButton variant="outline" onClick={reset}>
                Cancel
              </PillButton>
              <PillButton
                onClick={confirm}
                disabled={commit.isPending || preview.positions.length === 0}
              >
                {commit.isPending ? "Importing…" : `Import ${preview.positions.length} positions`}
              </PillButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
