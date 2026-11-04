// Position performance from a trade ledger: FIFO lots, holding period and XIRR.
// Pure TypeScript so the browser and edge functions share one implementation.

export type Trade = {
  date: string; // YYYY-MM-DD
  side: "buy" | "sell" | "dividend" | "split";
  quantity: number;
  price: number;
  amount?: number | null; // cash amount for dividends
};

export type CashFlow = { date: string; amount: number }; // negative = money in, positive = money out

const DAY = 86_400_000;
const toTime = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);

/** Annualised internal rate of return for irregular cash flows. Returns a fraction (0.12 = 12%). */
export function xirr(flows: CashFlow[]): number | null {
  const fs = flows.filter((f) => Number.isFinite(f.amount) && f.amount !== 0);
  if (fs.length < 2 || !fs.some((f) => f.amount < 0) || !fs.some((f) => f.amount > 0)) return null;
  const t0 = Math.min(...fs.map((f) => toTime(f.date)));
  const years = fs.map((f) => (toTime(f.date) - t0) / (365 * DAY));
  const npv = (r: number) => fs.reduce((a, f, i) => a + f.amount / Math.pow(1 + r, years[i]!), 0);
  const dnpv = (r: number) =>
    fs.reduce((a, f, i) => a - (years[i]! * f.amount) / Math.pow(1 + r, years[i]! + 1), 0);

  // Newton's method from a sensible start, then bisection as a fallback.
  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const v = npv(r);
    const d = dnpv(r);
    if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break;
    const next = r - v / d;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }
  let lo = -0.9999;
  let hi = 100;
  let flo = npv(lo);
  const fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

export type PositionStats = {
  /** Shares explained by the trade history (buys − sells). */
  tradedQuantity: number;
  /** True when the trade history accounts for the current holding (within 0.5%). */
  complete: boolean;
  /** Earliest buy date among the shares still held (FIFO). */
  heldSince: string | null;
  /** Quantity-weighted average age of the shares still held, in days. */
  avgHoldingDays: number | null;
  /** Average cost of the shares still held, from the trades (FIFO). */
  fifoEntryPrice: number | null;
  /** Annualised return including buys, sells, dividends and today's value. Fraction. */
  xirr: number | null;
  invested: number;
  realised: number;
  dividends: number;
};

/**
 * @param trades all trades for one instrument (any order)
 * @param currentQuantity shares held today (from the broker)
 * @param currentPrice latest price
 * @param asOf valuation date, YYYY-MM-DD
 */
export function positionStats(
  trades: Trade[],
  currentQuantity: number,
  currentPrice: number | null,
  asOf: string,
): PositionStats {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const lots: { date: string; qty: number; price: number }[] = [];
  const flows: CashFlow[] = [];
  let invested = 0;
  let realised = 0;
  let dividends = 0;

  for (const t of sorted) {
    if (t.side === "buy") {
      lots.push({ date: t.date, qty: t.quantity, price: t.price });
      flows.push({ date: t.date, amount: -t.quantity * t.price });
      invested += t.quantity * t.price;
    } else if (t.side === "sell") {
      let left = t.quantity;
      while (left > 1e-9 && lots.length) {
        const lot = lots[0]!;
        const take = Math.min(lot.qty, left);
        lot.qty -= take;
        left -= take;
        if (lot.qty <= 1e-9) lots.shift();
      }
      flows.push({ date: t.date, amount: t.quantity * t.price });
      realised += t.quantity * t.price;
    } else if (t.side === "split") {
      // Extra shares from a split: scale every open lot, keeping its date and total cost.
      const held = lots.reduce((x, l) => x + l.qty, 0);
      if (held > 0 && t.quantity) {
        const factor = (held + t.quantity) / held;
        for (const l of lots) {
          l.qty *= factor;
          l.price /= factor;
        }
      }
    } else {
      const amt = t.amount ?? t.quantity * t.price;
      if (amt) flows.push({ date: t.date, amount: amt });
      dividends += amt;
    }
  }

  const tradedQuantity = lots.reduce((a, l) => a + l.qty, 0);
  const complete =
    currentQuantity > 0 &&
    tradedQuantity > 0 &&
    Math.abs(tradedQuantity - currentQuantity) / currentQuantity <= 0.005;

  const asOfT = toTime(asOf);
  const heldSince = lots[0]?.date ?? null;
  const avgHoldingDays = tradedQuantity
    ? lots.reduce((a, l) => a + l.qty * ((asOfT - toTime(l.date)) / DAY), 0) / tradedQuantity
    : null;
  const fifoEntryPrice = tradedQuantity
    ? lots.reduce((a, l) => a + l.qty * l.price, 0) / tradedQuantity
    : null;

  let irr: number | null = null;
  if (complete && currentPrice != null && heldSince) {
    const firstFlow = flows[0]?.date ?? heldSince;
    // Under ~30 days an annualised figure is mostly noise.
    if ((asOfT - toTime(firstFlow)) / DAY >= 30) {
      irr = xirr([...flows, { date: asOf, amount: currentQuantity * currentPrice }]);
    }
  }

  return {
    tradedQuantity,
    complete,
    heldSince,
    avgHoldingDays,
    fifoEntryPrice,
    xirr: irr,
    invested,
    realised,
    dividends,
  };
}

/** Portfolio-level XIRR across several positions valued today. */
export function portfolioXirr(
  positions: { trades: Trade[]; value: number }[],
  asOf: string,
): number | null {
  const flows: CashFlow[] = [];
  let total = 0;
  for (const p of positions) {
    for (const t of p.trades) {
      if (t.side === "buy") flows.push({ date: t.date, amount: -t.quantity * t.price });
      else if (t.side === "sell") flows.push({ date: t.date, amount: t.quantity * t.price });
      else if (t.side === "dividend")
        flows.push({ date: t.date, amount: t.amount ?? t.quantity * t.price });
    }
    total += p.value;
  }
  if (!flows.length) return null;
  return xirr([...flows, { date: asOf, amount: total }]);
}

/** "2y 3m", "7m", "12d" */
export function formatHoldingPeriod(days: number | null): string {
  if (days == null || !Number.isFinite(days)) return "—";
  const d = Math.max(0, Math.round(days));
  if (d < 31) return `${d}d`;
  const months = Math.floor(d / 30.44);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m}m`;
  return m ? `${y}y ${m}m` : `${y}y`;
}
