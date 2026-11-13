import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PillButton } from "@/components/app/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSetOpeningLots } from "@/data/hooks";
import type { Holding, TradeImport, Txn } from "@/data/types";
import { money, qty } from "@/lib/format";
import { missingLot, statsBySymbol } from "./positions";

/**
 * For holdings the broker trade history doesn't explain, record an approximate purchase date.
 * Each becomes one opening lot (missing units at the price that matches the broker's average
 * cost), which makes XIRR and holding period calculable. Shown as estimated everywhere.
 */
export function PurchaseDatesDialog({
  open,
  onOpenChange,
  holdings,
  txns,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  holdings: Holding[];
  txns: Txn[];
}) {
  const save = useSetOpeningLots();
  // Work from broker trades only, so an existing estimate can be edited.
  const real = useMemo(
    () =>
      statsBySymbol(
        holdings,
        txns.filter((t) => !t.estimated),
      ),
    [holdings, txns],
  );
  const rows = useMemo(
    () =>
      holdings
        .map((h) => ({ h, lot: missingLot(h, real.get(h.symbol)) }))
        .filter((r): r is { h: Holding; lot: { quantity: number; price: number } } => !!r.lot)
        .sort((a, b) => a.h.symbol.localeCompare(b.h.symbol)),
    [holdings, real],
  );
  const existing = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of txns) if (t.estimated) m[t.symbol] = t.date;
    return m;
  }, [txns]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [all, setAll] = useState("");
  const dates = { ...existing, ...edits };
  const today = new Date().toISOString().slice(0, 10);

  const submit = () => {
    const payload: TradeImport[] = rows
      .filter(({ h }) => edits[h.symbol] !== undefined)
      .map(({ h, lot }) => ({
        source: h.source,
        symbol: h.symbol,
        date: edits[h.symbol]!,
        side: "buy",
        quantity: edits[h.symbol] ? lot.quantity : 0,
        price: lot.price,
        currency: h.currency,
        externalId: `opening:${h.symbol}`,
      }));
    if (!payload.length) return onOpenChange(false);
    save.mutate(payload, {
      onSuccess: () => {
        toast.success(`Purchase dates saved for ${payload.length} holdings`);
        setEdits({});
        onOpenChange(false);
      },
      onError: (e) => toast.error("Couldn't save purchase dates", { description: e.message }),
    });
  };

  const field =
    "rounded-[4px] border border-line bg-paper px-2.5 py-1.5 text-[14px] text-ink [color-scheme:dark] focus:border-brand/60 focus:outline-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto border-line bg-surface sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Purchase dates</DialogTitle>
          <DialogDescription className="text-ink-2">
            XIRR needs to know when each holding was bought. For holdings your imported trades don't
            cover, enter the date you bought them (the main purchase date is fine if you bought in
            several lots). The result is shown as an estimate.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-6 text-[15px] text-ink-2">
            Every holding is already covered by your trade history.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-y border-line py-3 text-[14px]">
              <span className="text-ink-3">Same date for all without one</span>
              <input
                type="date"
                max={today}
                value={all}
                onChange={(e) => setAll(e.target.value)}
                className={field}
              />
              <button
                type="button"
                disabled={!all}
                className="underline underline-offset-4 disabled:opacity-40"
                onClick={() =>
                  setEdits((d) => {
                    const next = { ...d };
                    for (const { h } of rows) if (!dates[h.symbol]) next[h.symbol] = all;
                    return next;
                  })
                }
              >
                Apply
              </button>
            </div>
            <ul className="divide-y divide-line/70">
              {rows.map(({ h, lot }) => (
                <li key={h.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{h.name ?? h.symbol}</div>
                    <div className="tabular text-[12px] text-ink-3">
                      {h.symbol} · {qty(lot.quantity)} units at {money(lot.price, h.currency)}
                      {lot.quantity < h.quantity * 0.995 && " (rest is in your trades)"}
                    </div>
                  </div>
                  <input
                    type="date"
                    max={today}
                    aria-label={`Purchase date for ${h.symbol}`}
                    value={dates[h.symbol] ?? ""}
                    onChange={(e) => setEdits((d) => ({ ...d, [h.symbol]: e.target.value }))}
                    className={field}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <PillButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </PillButton>
          {rows.length > 0 && (
            <PillButton onClick={submit} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save dates"}
            </PillButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
