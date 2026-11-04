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

/** Portfolio XIRR, only when every current holding is explained by the trade history. */
export function bookXirr(holdings: Holding[], txns: Txn[], stats: Map<string, PositionStats>) {
  const covered = holdings.filter((h) => stats.get(h.symbol)?.complete).length;
  if (!holdings.length || covered < holdings.length)
    return { xirr: null, covered, total: holdings.length };
  const value = holdings.reduce((a, h) => a + (marketValue(h) ?? 0), 0);
  return {
    xirr: portfolioXirr([{ trades: txns.map(asTrade), value }], today()),
    covered,
    total: holdings.length,
  };
}
