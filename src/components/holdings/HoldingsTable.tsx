import type { PositionStats } from "@shared/performance";
import { formatHoldingPeriod } from "@shared/performance";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Delta } from "@/components/app/primitives";
import { useRepo } from "@/data/RepoContext";
import {
  invested,
  marketValue,
  pnl,
  pnlPct,
  type CompanyProfile,
  type Holding,
} from "@/data/types";
import { moneyCompact, money, pct, qty, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "./CompanyLogo";
import { xirrInfo } from "./positions";

type Key = "name" | "weight" | "value" | "cost" | "ret" | "xirr" | "held" | "entry" | "ltp" | "day";

/**
 * Investment-team book view: one row per company, sortable, with weight, value, return, XIRR,
 * holding period and entry price. Rows open the company page.
 */
export function HoldingsTable({
  holdings,
  showDay = true,
  profiles,
  stats,
  bookXirr,
}: {
  holdings: Holding[];
  showDay?: boolean;
  profiles?: Map<string, CompanyProfile>;
  stats?: Map<string, PositionStats>;
  bookXirr?: number | null;
}) {
  const navigate = useNavigate();
  const { base } = useRepo();
  const open = (h: Holding) => navigate(`${base}/holding/${encodeURIComponent(h.symbol)}`);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "value", dir: -1 });

  const total = holdings.reduce((a, h) => a + (marketValue(h) ?? invested(h)), 0);
  const cost = holdings.reduce((a, h) => a + invested(h), 0);
  const ccy = holdings[0]?.currency ?? "INR";
  const nameOf = (h: Holding) => profiles?.get(h.symbol)?.name ?? h.name ?? h.symbol;

  const rows = useMemo(() => {
    const get: Record<Key, (h: Holding) => number | string | null> = {
      name: (h) => nameOf(h),
      weight: (h) => marketValue(h) ?? invested(h),
      value: (h) => marketValue(h) ?? invested(h),
      cost: (h) => invested(h),
      ret: (h) => pnlPct(h),
      xirr: (h) => stats?.get(h.symbol)?.xirr ?? null,
      held: (h) => stats?.get(h.symbol)?.avgHoldingDays ?? null,
      entry: (h) => h.avgPrice,
      ltp: (h) => h.lastPrice,
      day: (h) => h.dayChangePct,
    };
    const g = get[sort.key];
    return [...holdings].sort((a, b) => {
      const x = g(a);
      const y = g(b);
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number)) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, sort, stats, profiles]);

  const th = (key: Key, label: string, opts: { left?: boolean; className?: string } = {}) => (
    <th
      scope="col"
      className={cn(
        "px-3 py-2.5 font-medium whitespace-nowrap",
        opts.left ? "text-left" : "text-right",
        opts.className,
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
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="tabular w-full min-w-[1040px] text-[14px]">
          <thead className="border-b border-line bg-paper-2 text-[12px] text-ink-3">
            <tr>
              {th("name", "Company", {
                left: true,
                className: "sticky left-0 z-10 bg-paper-2 pl-5",
              })}
              {th("weight", "Weight")}
              {th("value", "Value")}
              {th("cost", "Cost")}
              {th("ret", "Return")}
              {th("xirr", "XIRR")}
              {th("held", "Holding")}
              {th("entry", "Entry price")}
              {th("ltp", "Last price")}
              {showDay && th("day", "Today", { className: "pr-5" })}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const p = profiles?.get(h.symbol);
              const s = stats?.get(h.symbol);
              const v = marketValue(h) ?? invested(h);
              const w = total ? (v / total) * 100 : 0;
              const x = xirrInfo(s, h.quantity);
              return (
                <tr
                  key={h.id}
                  onClick={() => open(h)}
                  className="group cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-paper-2/60"
                >
                  <td className="sticky left-0 z-10 bg-surface py-2.5 pr-3 pl-5 group-hover:bg-paper-2">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={nameOf(h)} website={p?.website} size={30} />
                      <div className="min-w-0">
                        <div className="max-w-[220px] truncate font-medium text-ink">
                          {nameOf(h)}
                        </div>
                        <div className="max-w-[220px] truncate text-[12px] text-ink-3">
                          {[h.symbol, p?.sector].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-12 rounded-full bg-paper-2 lg:block">
                        <div
                          className="h-1.5 rounded-full bg-series-1"
                          style={{ width: `${Math.min(100, w * 4)}%` }}
                        />
                      </div>
                      <span className="w-12">{pct(w, 1, false)}</span>
                    </div>
                  </td>
                  <td className="px-3 text-right font-medium">{moneyCompact(v, h.currency)}</td>
                  <td className="px-3 text-right text-ink-2">
                    {moneyCompact(invested(h), h.currency)}
                  </td>
                  <td className="px-3 text-right">
                    <div>
                      <Delta value={pnlPct(h)}>{pct(pnlPct(h), 1)}</Delta>
                    </div>
                    <div className="text-[12px] text-ink-3">
                      {signedMoney(pnl(h), h.currency, true)}
                    </div>
                  </td>
                  <td className="px-3 text-right">
                    {x.value != null ? (
                      <Delta value={x.value} className="font-medium">
                        {pct(x.value * 100, 1)}
                      </Delta>
                    ) : (
                      <span className="text-[12px] text-ink-3">{x.note}</span>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    {s?.heldSince ? (
                      <>
                        <div>{formatHoldingPeriod(s.avgHoldingDays)}</div>
                        <div className="text-[12px] text-ink-3">
                          since {format(parseISO(s.heldSince), "MMM yy")}
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    <div>{money(h.avgPrice, h.currency)}</div>
                    <div className="text-[12px] text-ink-3">{qty(h.quantity)} units</div>
                  </td>
                  <td className="px-3 text-right">{money(h.lastPrice, h.currency)}</td>
                  {showDay && (
                    <td className="py-2.5 pr-5 pl-3 text-right">
                      <Delta value={h.dayChangePct}>{pct(h.dayChangePct)}</Delta>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-ink/20 text-[13px] font-medium">
            <tr>
              <td className="sticky left-0 bg-surface py-3 pr-3 pl-5">
                Total · {holdings.length} holdings
              </td>
              <td className="px-3 text-right">100%</td>
              <td className="px-3 text-right">{moneyCompact(total, ccy)}</td>
              <td className="px-3 text-right text-ink-2">{moneyCompact(cost, ccy)}</td>
              <td className="px-3 text-right">
                <Delta value={total - cost}>
                  {pct(cost ? ((total - cost) / cost) * 100 : null, 1)}
                </Delta>
              </td>
              <td className="px-3 text-right">
                {bookXirr != null ? (
                  <Delta value={bookXirr}>{pct(bookXirr * 100, 1)}</Delta>
                ) : (
                  <span className="text-ink-3">—</span>
                )}
              </td>
              <td colSpan={showDay ? 4 : 3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Phone */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((h) => {
          const s = stats?.get(h.symbol);
          const x = xirrInfo(s, h.quantity);
          const v = marketValue(h) ?? invested(h);
          return (
            <li
              key={h.id}
              onClick={() => open(h)}
              className="tabular flex cursor-pointer items-center gap-3 px-4 py-3"
            >
              <CompanyLogo name={nameOf(h)} website={profiles?.get(h.symbol)?.website} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{nameOf(h)}</div>
                <div className="truncate text-[12px] text-ink-3">
                  {pct(total ? (v / total) * 100 : 0, 1, false)} ·{" "}
                  {x.value != null ? `XIRR ${pct(x.value * 100, 1)}` : x.note}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium">{moneyCompact(v, h.currency)}</div>
                <div className="text-[12px]">
                  <Delta value={pnlPct(h)}>{pct(pnlPct(h), 1)}</Delta>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
