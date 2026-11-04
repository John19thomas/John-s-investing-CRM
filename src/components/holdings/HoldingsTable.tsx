import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Delta } from "@/components/app/primitives";
import { invested, marketValue, pnl, pnlPct, type Holding } from "@/data/types";
import { money, pct, qty, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Key = "symbol" | "quantity" | "avg" | "ltp" | "value" | "pnl" | "pnlPct" | "day" | "weight";

const getters: Record<Key, (h: Holding) => number | string | null> = {
  symbol: (h) => h.symbol,
  quantity: (h) => h.quantity,
  avg: (h) => h.avgPrice,
  ltp: (h) => h.lastPrice,
  value: (h) => marketValue(h) ?? invested(h),
  pnl: (h) => pnl(h),
  pnlPct: (h) => pnlPct(h),
  day: (h) => h.dayChangePct,
  weight: (h) => marketValue(h) ?? invested(h),
};

export function HoldingsTable({
  holdings,
  showDay = true,
}: {
  holdings: Holding[];
  showDay?: boolean;
}) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "value", dir: -1 });
  const total = holdings.reduce((a, h) => a + (marketValue(h) ?? invested(h)), 0);

  const rows = useMemo(() => {
    const g = getters[sort.key];
    return [...holdings].sort((a, b) => {
      const x = g(a);
      const y = g(b);
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number)) * sort.dir;
    });
  }, [holdings, sort]);

  const th = (key: Key, label: string, align: "left" | "right" = "right") => (
    <th
      scope="col"
      className={cn(
        "px-3 py-3 font-medium first:pl-6 last:pr-6",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() =>
          setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }))
        }
        className={cn(
          "inline-flex items-center gap-1 hover:text-ink",
          sort.key === key && "text-ink",
        )}
      >
        {label}
        {sort.key === key &&
          (sort.dir === -1 ? (
            <ArrowDown className="size-3" aria-hidden />
          ) : (
            <ArrowUp className="size-3" aria-hidden />
          ))}
      </button>
    </th>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-[12px] text-ink-3">
            <tr>
              {th("symbol", "Instrument", "left")}
              {th("quantity", "Qty")}
              {th("avg", "Avg cost")}
              {th("ltp", "Last price")}
              {th("value", "Value")}
              {th("pnl", "P&L")}
              {th("pnlPct", "Return")}
              {showDay && th("day", "Day")}
              {th("weight", "Weight")}
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((h) => {
              const v = marketValue(h);
              const p = pnl(h);
              const w = ((v ?? invested(h)) / total) * 100;
              return (
                <tr
                  key={h.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-paper/60"
                >
                  <td className="py-3 pr-3 pl-6">
                    <div className="font-semibold tracking-tight">{h.symbol}</div>
                    <div className="max-w-[240px] truncate text-[12px] text-ink-3">
                      {h.name ?? h.exchange ?? ""}
                      {h.source === "kite_mf" && " · Mutual fund"}
                    </div>
                  </td>
                  <td className="px-3 text-right">{qty(h.quantity)}</td>
                  <td className="px-3 text-right text-ink-2">{money(h.avgPrice, h.currency)}</td>
                  <td className="px-3 text-right">{money(h.lastPrice, h.currency)}</td>
                  <td className="px-3 text-right font-medium">
                    {money(v ?? invested(h), h.currency, 0)}
                  </td>
                  <td className="px-3 text-right">
                    <Delta value={p}>{signedMoney(p, h.currency, false, 0)}</Delta>
                  </td>
                  <td className="px-3 text-right">
                    <Delta value={pnlPct(h)}>{pct(pnlPct(h), 1)}</Delta>
                  </td>
                  {showDay && (
                    <td className="px-3 text-right">
                      <Delta value={h.dayChangePct}>{pct(h.dayChangePct)}</Delta>
                    </td>
                  )}
                  <td className="py-3 pr-6 pl-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-14 rounded-full bg-paper-2">
                        <div
                          className="h-1.5 rounded-full bg-series-1"
                          style={{ width: `${Math.min(100, w * 3)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-ink-2">{pct(w, 1, false)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((h) => {
          const v = marketValue(h);
          const p = pnl(h);
          return (
            <li key={h.id} className="tabular flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <div className="font-semibold tracking-tight">{h.symbol}</div>
                <div className="truncate text-[12px] text-ink-3">
                  {qty(h.quantity)} × {money(h.avgPrice, h.currency)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium">{money(v ?? invested(h), h.currency, 0)}</div>
                <div className="text-[12px]">
                  <Delta value={p}>{pct(pnlPct(h), 1)}</Delta>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
