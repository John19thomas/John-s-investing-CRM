import { parseTradebook, type TradebookResult } from "@shared/tradebook";
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
import { useImportTrades } from "@/data/hooks";
import type { Holding, TradeImport } from "@/data/types";
import { cn } from "@/lib/utils";

/** Import Zerodha Console tradebook CSVs (one per financial year is fine; duplicates are skipped). */
export function TradebookDialog({
  open,
  onOpenChange,
  holdings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  holdings: Holding[];
}) {
  const importTrades = useImportTrades();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; result: TradebookResult }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const held = new Set(holdings.map((h) => h.symbol));
  const trades = files.flatMap((f) => f.result.trades);
  // Mutual funds are matched by ISIN (Kite's fund holdings use the ISIN as the symbol).
  const rows: TradeImport[] = trades.map((t) => {
    const mf = t.segment === "MF" || (!!t.isin && held.has(t.isin) && !held.has(t.symbol));
    return {
      source: mf ? "kite_mf" : "kite",
      symbol: mf && t.isin ? t.isin : t.symbol,
      date: t.date,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      currency: "INR",
      externalId: t.tradeId,
    };
  });
  const symbols = [...new Set(rows.map((r) => r.symbol))];
  const matched = symbols.filter((s) => held.has(s)).length;
  const dates = trades.map((t) => t.date).sort();

  const reset = () => {
    setFiles([]);
    setError(null);
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const next = [...files];
    for (const f of Array.from(list)) {
      try {
        next.push({ name: f.name, result: parseTradebook(await f.text()) });
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    setFiles(next);
  };

  const confirm = () =>
    importTrades.mutate(rows, {
      onSuccess: () => {
        toast.success(`Imported ${rows.length} trades`);
        reset();
        onOpenChange(false);
      },
      onError: (e) => toast.error("Import failed", { description: e.message }),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-line bg-surface sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Import Zerodha tradebook</DialogTitle>
          <DialogDescription className="text-ink-2">
            Kite shows what you hold today but not when you bought it. Your tradebook adds the buy
            and sell dates needed for holding period and XIRR.
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink-2">
          <li>
            Open{" "}
            <a
              href="https://console.zerodha.com/reports/tradebook"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              console.zerodha.com → Reports → Tradebook
            </a>
            .
          </li>
          <li>Choose Equity (and separately Mutual funds), pick a date range, and download CSV.</li>
          <li>Repeat for every year back to your first purchase, and add all the files here.</li>
        </ol>

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
            void onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center rounded-sm border border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-ink bg-paper-2" : "border-line hover:bg-paper-2",
          )}
        >
          <Upload className="size-5 text-ink-2" aria-hidden />
          <span className="mt-2 font-medium">Drop tradebook CSVs here, or click to choose</span>
          <span className="mt-0.5 text-[13px] text-ink-3">You can add several files</span>
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {error && (
          <p className="flex items-start gap-2 rounded-sm bg-loss/8 px-4 py-3 text-sm text-loss">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}

        {files.length > 0 && (
          <div className="space-y-3">
            <ul className="space-y-1.5 text-[14px]">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-2 text-ink-2">
                  <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto shrink-0 text-ink-3">
                    {f.result.trades.length} trades
                    {f.result.skipped ? `, ${f.result.skipped} skipped` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-sm bg-paper-2 px-4 py-3 text-[14px] text-ink-2">
              {rows.length} trades across {symbols.length} instruments
              {dates.length > 0 && `, ${dates[0]} to ${dates.at(-1)}`}. {matched} of{" "}
              {holdings.length} current holdings matched. Trades already imported are skipped.
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <PillButton variant="outline" onClick={reset}>
                Clear
              </PillButton>
              <PillButton onClick={confirm} disabled={!rows.length || importTrades.isPending}>
                {importTrades.isPending ? "Importing…" : `Import ${rows.length} trades`}
              </PillButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
