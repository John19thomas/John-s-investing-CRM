import { positionStats, portfolioXirr, type PositionStats, type Trade } from "@shared/performance";
import { marketValue, type Holding, type Txn } from "@/data/types";

const today = () => new Date().toISOString().slice(0, 10);

const asTrade = (t: Txn): Trade => ({
  date: t.date,
  side: t.side,
  quantity: t.quantity,
  price: t.price,
  amount: t.amount,
});

/** Holding period and XIRR per symbol, from the trade ledger. */
export function statsBySymbol(holdings: Holding[], txns: Txn[]): Map<string, PositionStats> {
  const bySymbol = new Map<string, Trade[]>();
  for (const t of txns) {
    const list = bySymbol.get(t.symbol) ?? [];
    list.push(asTrade(t));
    bySymbol.set(t.symbol, list);
  }
  const out = new Map<string, PositionStats>();
  for (const h of holdings) {
    out.set(
      h.symbol,
      positionStats(bySymbol.get(h.symbol) ?? [], h.quantity, h.lastPrice, today()),
    );
  }
  return out;
}

/**
 * Blended XIRR across the holdings whose purchases are fully known (from broker trades or a
 * hand-entered opening lot). `coveredValuePct` says how much of the book that is.
 */
export function bookXirr(holdings: Holding[], txns: Txn[], stats: Map<string, PositionStats>) {
  const inBook = holdings.filter((h) => stats.get(h.symbol)?.complete);
  const symbols = new Set(inBook.map((h) => h.symbol));
  const value = inBook.reduce((a, h) => a + (marketValue(h) ?? 0), 0);
  const total = holdings.reduce((a, h) => a + (marketValue(h) ?? 0), 0);
  const estimated = new Set(txns.filter((t) => t.estimated).map((t) => t.symbol));
  return {
    xirr: inBook.length
      ? portfolioXirr(
          [{ trades: txns.filter((t) => symbols.has(t.symbol)).map(asTrade), value }],
          today(),
        )
      : null,
    covered: inBook.length,
    total: holdings.length,
    coveredValuePct: total ? (value / total) * 100 : 0,
    /** How many of the covered holdings rely on a hand-entered purchase date. */
    estimated: inBook.filter((h) => estimated.has(h.symbol)).length,
  };
}

/** One-line description of what the blended XIRR covers. */
export function bookXirrNote(b: ReturnType<typeof bookXirr>) {
  if (b.xirr == null) return "Add purchase dates to see this";
  const parts = [
    b.covered === b.total
      ? "Annualised · all holdings"
      : `${b.covered} of ${b.total} holdings · ${Math.round(b.coveredValuePct)}% of value`,
  ];
  if (b.estimated) parts.push(`${b.estimated} estimated`);
  return parts.join(" · ");
}

/**
 * The lot that is missing from the broker trade history: the units not explained by trades,
 * priced so that total cost matches the broker's average price. Null when nothing is missing
 * or the history doesn't reconcile (more units traded than held).
 */
export function missingLot(h: Holding, real: PositionStats | undefined) {
  const traded = real?.tradedQuantity ?? 0;
  const quantity = h.quantity - traded;
  if (quantity <= h.quantity * 0.005) return null;
  const cost = h.quantity * h.avgPrice - traded * (real?.fifoEntryPrice ?? 0);
  const price = cost > 0 ? cost / quantity : h.avgPrice;
  return { quantity, price };
}

/** XIRR for display, or a short reason why it can't be calculated yet. */
export function xirrInfo(
  s: PositionStats | undefined,
  held: number,
): { value: number | null; note: string } {
  if (!s || s.tradedQuantity <= 0) return { value: null, note: "No trade history" };
  if (s.xirr != null) return { value: s.xirr, note: "" };
  if (!s.complete) {
    const pctCovered = Math.max(0, Math.min(100, Math.round((s.tradedQuantity / held) * 100)));
    return { value: null, note: `Partial history (${pctCovered}%)` };
  }
  return { value: null, note: "Held < 30 days" };
}
