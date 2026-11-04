import { invested, marketValue, type Holding } from "@/data/types";

export type PortfolioSummary = {
  currency: string;
  invested: number;
  value: number | null; // null when no prices are known (e.g. a transactions-only Revolut import)
  pnl: number | null;
  pnlPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  count: number;
  lastSynced: string | null;
};

/** Totals for one currency. Holdings in other currencies are reported separately. */
export function summarize(holdings: Holding[], currency: string): PortfolioSummary {
  const hs = holdings.filter((h) => h.currency === currency);
  const inv = hs.reduce((a, h) => a + invested(h), 0);
  const priced = hs.filter((h) => h.lastPrice != null);
  const value = priced.length ? hs.reduce((a, h) => a + (marketValue(h) ?? invested(h)), 0) : null;
  const pnl = value == null ? null : value - inv;

  let prevTotal = 0;
  let dayChange = 0;
  let haveDay = false;
  for (const h of hs) {
    const v = marketValue(h);
    if (v == null || h.dayChangePct == null) continue;
    const prev = v / (1 + h.dayChangePct / 100);
    prevTotal += prev;
    dayChange += v - prev;
    haveDay = true;
  }

  return {
    currency,
    invested: inv,
    value,
    pnl,
    pnlPct: pnl == null || !inv ? null : (pnl / inv) * 100,
    dayChange: haveDay ? dayChange : null,
    dayChangePct: haveDay && prevTotal ? (dayChange / prevTotal) * 100 : null,
    count: hs.length,
    lastSynced: hs.reduce<string | null>(
      (a, h) => (!a || h.snapshotAt > a ? h.snapshotAt : a),
      null,
    ),
  };
}

/** The currency holding the most cost basis, used as the headline currency. */
export function primaryCurrency(holdings: Holding[], fallback: string) {
  const by = new Map<string, number>();
  for (const h of holdings) by.set(h.currency, (by.get(h.currency) ?? 0) + invested(h));
  return [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}
